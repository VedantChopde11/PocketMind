import { NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(req) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      expectedAmount,
    } = await req.json();

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !expectedAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing payment details",
        },
        { status: 400 }
      );
    }

    const generatedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment signature verification failed",
        },
        { status: 400 }
      );
    }

    const payment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (payment.status !== "captured") {
      return NextResponse.json(
        {
          success: false,
          error: `Payment is not captured. Status: ${payment.status}`,
        },
        { status: 400 }
      );
    }

    const expectedAmountInPaise =
      Math.round(Number(expectedAmount) * 100);

    if (payment.amount !== expectedAmountInPaise) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment amount does not match settlement amount",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",

      payment: {
        id: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      },
    });

  } catch (error) {
    console.error("Payment verification error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Payment verification failed",
      },
      { status: 500 }
    );
  }
}