import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const CATEGORY_MAP = {
  "food & drink": "foodDrink",
  "food": "foodDrink",
  "restaurant": "foodDrink",
  "dining": "foodDrink",
  "meal": "foodDrink",

  coffee: "coffee",
  cafe: "coffee",
  café: "coffee",

  groceries: "groceries",
  grocery: "groceries",

  shopping: "shopping",
  retail: "shopping",

  travel: "travel",
  tourism: "travel",
  hotel: "travel",

  transportation: "transportation",
  transport: "transportation",
  taxi: "transportation",
  cab: "transportation",
  uber: "transportation",
  ola: "transportation",

  housing: "housing",
  rent: "housing",

  entertainment: "entertainment",
  movie: "entertainment",
  cinema: "entertainment",
  netflix: "entertainment",

  tickets: "tickets",

  utilities: "utilities",
  electricity: "utilities",
  internet: "utilities",

  water: "water",

  education: "education",
  school: "education",
  college: "education",
  tuition: "education",

  health: "health",
  medical: "health",
  medicine: "health",
  pharmacy: "health",

  personal: "personal",

  gifts: "gifts",
  gift: "gifts",

  technology: "technology",
  electronics: "technology",
  mobile: "technology",

  bills: "bills",
  bill: "bills",
  fees: "bills",

  "baby & kids": "baby",
  baby: "baby",
  kids: "baby",

  music: "music",

  books: "books",
  book: "books",

  general: "general",
  "general expense": "general",

  other: "other",
};

function normalizeCategory(category) {
  if (!category) {
    return "other";
  }

  const normalized = category
    .toString()
    .trim()
    .toLowerCase();

  if (CATEGORY_MAP[normalized]) {
    return CATEGORY_MAP[normalized];
  }

  
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (
      normalized.includes(key) ||
      key.includes(normalized)
    ) {
      return value;
    }
  }

  return "other";
}

function cleanJsonResponse(text) {
  let cleaned = text.trim();

  
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
  }

  return cleaned.trim();
}

export async function POST(request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No receipt file was provided.",
        },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported file type. Please upload JPG, PNG, WEBP, HEIC, HEIF, or PDF.",
        },
        { status: 400 }
      );
    }

    // 10 MB maximum.
    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "File is too large. Maximum size is 10 MB.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    const base64Data = Buffer.from(arrayBuffer).toString(
      "base64"
    );

    const model = genAI.getGenerativeModel({
      model:
        process.env.GEMINI_MODEL ||
        "gemini-3.6-flash",
    });

    const prompt = `
You are an expense receipt OCR and extraction system.

Analyze the uploaded receipt image or PDF and extract ONLY the following
expense-level information.

Do NOT extract individual items.
Do NOT calculate item-wise splits.
Do NOT create participant information.
Do NOT invent information that is not visible.

Return ONLY valid JSON in exactly this structure:

{
  "description": "string or null",
  "merchant": "string or null",
  "amount": number or null,
  "category": "string or null",
  "date": "YYYY-MM-DD or null",
  "currency": "string or null",
  "paymentMethod": "string or null"
}

Rules:

1. "description":
   A short useful description of the expense.
   Example: "Dinner at Domino's".
   If a suitable description cannot be determined, use the merchant name.

2. "merchant":
   Extract the business/store/restaurant/provider name.

3. "amount":
   Extract the FINAL TOTAL amount paid.
   Do not use subtotal, tax amount, discount, individual item price,
   or amount due before adjustments.
   Return only a number.

4. "category":
   Choose the closest category from this list:
   - Food & Drink
   - Coffee
   - Groceries
   - Shopping
   - Travel
   - Transportation
   - Housing
   - Entertainment
   - Tickets
   - Utilities
   - Water
   - Education
   - Health
   - Personal
   - Gifts
   - Technology
   - Bills & Fees
   - Baby & Kids
   - Music
   - Books
   - General Expense
   - Other

5. "date":
   Extract the transaction/receipt date.
   Convert it to YYYY-MM-DD.
   If no reliable date is visible, return null.

6. "currency":
   Return the currency symbol or currency code if visible.
   Examples: INR, $, USD, EUR.

7. "paymentMethod":
   Return the payment method only if clearly visible.
   Examples: UPI, Cash, Credit Card, Debit Card.

Important:
- Never guess an amount.
- Never use item-wise totals when a final total is available.
- If a field is not visible or cannot be determined reliably, return null.
`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      },
      prompt,
    ]);

    const responseText =
      result.response.text();

    const cleanedResponse =
      cleanJsonResponse(responseText);

    let extracted;

    try {
      extracted = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error(
        "Gemini JSON parse error:",
        parseError
      );
      console.error(
        "Gemini response:",
        responseText
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Gemini returned an invalid response. Please try another receipt.",
        },
        { status: 500 }
      );
    }

    const amount =
      typeof extracted.amount === "number"
        ? extracted.amount
        : null;

    const category =
      normalizeCategory(
        extracted.category
      );

    let description =
      extracted.description ||
      extracted.merchant ||
      "";

    if (
      typeof description !== "string"
    ) {
      description = "";
    }

    let date = null;

    if (
      typeof extracted.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(
        extracted.date
      )
    ) {
      date = extracted.date;
    }

    return NextResponse.json({
      success: true,
      data: {
        description,
        merchant:
          extracted.merchant || null,
        amount,
        category,
        date,
        currency:
          extracted.currency || null,
        paymentMethod:
          extracted.paymentMethod || null,
      },
    });
  } catch (error) {
    console.error(
      "Receipt OCR error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to process receipt.",
      },
      { status: 500 }
    );
  }
}