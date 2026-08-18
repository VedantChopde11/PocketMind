"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export function SplitSelector({
  type,
  amount,
  participants,
  paidByUserId,
  onSplitsChange,
}) {
  const { user } = useUser();

  const [editedSplits, setEditedSplits] = useState({});


  const defaultSplits = useMemo(() => {
    if (!amount || amount <= 0 || participants.length === 0) {
      return [];
    }

    const participantCount = participants.length;

    return participants.map((participant) => {
      let splitAmount = 0;
      let percentage = 0;

      if (type === "equal") {
        percentage = 100 / participantCount;
        splitAmount = amount / participantCount;
      } else if (type === "percentage") {
        percentage = 100 / participantCount;
        splitAmount = (amount * percentage) / 100;
      } else if (type === "exact") {
        splitAmount = amount / participantCount;
        percentage = (splitAmount / amount) * 100;
      }

      return {
        userId: participant.id,
        name: participant.name,
        email: participant.email,
        imageUrl: participant.imageUrl,
        amount: splitAmount,
        percentage,
        paid: participant.id === paidByUserId,
      };
    });
  }, [type, amount, participants, paidByUserId]);

 
  const splits = useMemo(() => {
    return defaultSplits.map((split) => {
      const edited = editedSplits[split.userId];

      if (!edited) {
        return split;
      }

      return {
        ...split,
        ...edited,
      };
    });
  }, [defaultSplits, editedSplits]);

 
  const totalAmount = useMemo(() => {
    return splits.reduce((sum, split) => sum + split.amount, 0);
  }, [splits]);

  
  const totalPercentage = useMemo(() => {
    return splits.reduce((sum, split) => sum + split.percentage, 0);
  }, [splits]);

 
  useEffect(() => {
    if (onSplitsChange) {
      onSplitsChange(splits);
    }
  }, [splits, onSplitsChange]);

 
  const updatePercentageSplit = (userId, newPercentage) => {
    const percentage = Number(newPercentage) || 0;

    setEditedSplits((prev) => ({
      ...prev,
      [userId]: {
        percentage,
        amount: (amount * percentage) / 100,
      },
    }));
  };

  const updateExactSplit = (userId, newAmount) => {
    const parsedAmount = parseFloat(newAmount) || 0;

    setEditedSplits((prev) => ({
      ...prev,
      [userId]: {
        amount: parsedAmount,
        percentage:
          amount > 0 ? (parsedAmount / amount) * 100 : 0,
      },
    }));
  };

 
  const isPercentageValid =
    Math.abs(totalPercentage - 100) < 0.01;

  const isAmountValid =
    Math.abs(totalAmount - amount) < 0.01;

  return (
    <div className="space-y-4 mt-4">
      {splits.map((split) => (
        <div
          key={split.userId}
          className="flex items-center justify-between gap-4"
        >
          {/* User */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <Avatar className="h-7 w-7">
              <AvatarImage src={split.imageUrl} />

              <AvatarFallback>
                {split.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>

            <span className="text-sm">
              {split.userId === user?.id ? "You" : split.name}
            </span>
          </div>

          {/* Equal split */}
          {type === "equal" && (
            <div className="text-right text-sm">
              ₹{split.amount.toFixed(2)} (
              {split.percentage.toFixed(1)}%)
            </div>
          )}

          {/* Percentage split */}
          {type === "percentage" && (
            <div className="flex items-center gap-4 flex-1">
              <Slider
                value={[split.percentage]}
                min={0}
                max={100}
                step={1}
                onValueChange={(values) =>
                  updatePercentageSplit(
                    split.userId,
                    values[0]
                  )
                }
                className="flex-1"
              />

              <div className="flex gap-1 items-center min-w-[100px]">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={split.percentage.toFixed(1)}
                  onChange={(e) =>
                    updatePercentageSplit(
                      split.userId,
                      e.target.value
                    )
                  }
                  className="w-16 h-8"
                />

                <span className="text-sm text-muted-foreground">
                  %
                </span>

                <span className="text-sm ml-1">
                  ₹{split.amount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Exact amount split */}
          {type === "exact" && (
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1"></div>

              <div className="flex gap-1 items-center">
                <span className="text-sm text-muted-foreground">
                  ₹
                </span>

                <Input
                  type="number"
                  min="0"
                  max={amount * 2}
                  step="0.01"
                  value={split.amount.toFixed(2)}
                  onChange={(e) =>
                    updateExactSplit(
                      split.userId,
                      e.target.value
                    )
                  }
                  className="w-24 h-8"
                />

                <span className="text-sm text-muted-foreground ml-1">
                  ({split.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Total */}
      <div className="flex justify-between border-t pt-3 mt-3">
        <span className="font-medium">Total</span>

        <div className="text-right">
          <span
            className={`font-medium ${
              !isAmountValid ? "text-amber-600" : ""
            }`}
          >
            ₹{totalAmount.toFixed(2)}
          </span>

          {type !== "equal" && (
            <span
              className={`text-sm ml-2 ${
                !isPercentageValid
                  ? "text-amber-600"
                  : ""
              }`}
            >
              ({totalPercentage.toFixed(1)}%)
            </span>
          )}
        </div>
      </div>

      {/* Percentage validation warning */}
      {type === "percentage" && !isPercentageValid && (
        <div className="text-sm text-amber-600 mt-2">
          The percentages should add up to 100%.
        </div>
      )}

      {/* Exact amount validation warning */}
      {type === "exact" && !isAmountValid && (
        <div className="text-sm text-amber-600 mt-2">
          The sum of all splits (₹{totalAmount.toFixed(2)})
          should equal the total amount (₹{amount.toFixed(2)}).
        </div>
      )}
    </div>
  );
}