"use client";

import { useState , useMemo , useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { api } from "@/convex/_generated/api";
import {
  useConvexMutation,
  useConvexQuery,
} from "@/hooks/use-convex-query";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { toast } from "sonner";

import { ParticipantSelector } from "./participant-selector";
import { GroupSelector } from "./group-selector";
import { CategorySelector } from "./category-selector";
import { SplitSelector } from "./split-selector";

import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ReceiptScanner } from "./receipt-scanner";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

import { getAllCategories } from "@/lib/expense-categories";

const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),

  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (val) =>
        !isNaN(parseFloat(val)) &&
        parseFloat(val) > 0,
      {
        message: "Amount must be a positive number",
      }
    ),

  category: z.string().optional(),

  date: z.date(),

  paidByUserId: z
    .string()
    .min(1, "Payer is required"),

  splitType: z.enum([
    "equal",
    "percentage",
    "exact",
  ]),

  groupId: z.string().optional(),
});

export function ExpenseForm({
  type = "individual",
  onSuccess,
}) {
  const [participants, setParticipants] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date()
  );
  const [selectedGroup, setSelectedGroup] =
    useState(null);
  const [splits, setSplits] = useState([]);
  const [entryMode, setEntryMode] = useState(null);


  const { data: currentUser } = useConvexQuery(
    api.users.getCurrentUser
  );

  const createExpense = useConvexMutation(
    api.expenses.createExpense
  );


  const categories = getAllCategories();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm({
    resolver: zodResolver(expenseSchema),

    defaultValues: {
      description: "",
      amount: "",
      category: "",
      date: new Date(),
      paidByUserId: "",
      splitType: "equal",
      groupId: undefined,
    },
  });

  useEffect(() => {
    if (currentUser?._id) {
      setValue(
        "paidByUserId",
        currentUser._id
      );
    }
  }, [
    currentUser?._id,
    setValue,
  ]);

 
  const amountValue = watch("amount");
  const paidByUserId = watch("paidByUserId");
  const splitType = watch("splitType");

  
  const currentUserParticipant = useMemo(() => {
    if (!currentUser) return null;

    return {
      id: currentUser._id,
      name: currentUser.name,
      email: currentUser.email,
      imageUrl: currentUser.imageUrl,
    };
  }, [
      currentUser?._id,
      currentUser?.name,
      currentUser?.email,
      currentUser?.imageUrl,
  ]);

  const handleReceiptExtracted = (receipt) => {
    if (!receipt) return;

    if (receipt.description) {
      setValue(
        "description",
        receipt.description,
        {
          shouldValidate: true,
          shouldDirty: true,
        }
      );
    }

    if (
      receipt.amount !== null &&
      receipt.amount !== undefined &&
      !isNaN(Number(receipt.amount))
    ) {
      setValue(
        "amount",
        String(receipt.amount),
        {
          shouldValidate: true,
          shouldDirty: true,
        }
      );
    }

    if (receipt.category) {
      setValue(
        "category",
        receipt.category,
        {
          shouldValidate: true,
          shouldDirty: true,
        }
      );
    }

    if (receipt.date) {
      const parsedDate = new Date(
        `${receipt.date}T12:00:00`
      );

      if (!isNaN(parsedDate.getTime())) {
        setSelectedDate(parsedDate);

        setValue(
          "date",
          parsedDate,
          {
            shouldValidate: true,
            shouldDirty: true,
          }
        );
      }
    }

    setEntryMode("manual");

    toast.success(
      "Receipt details added to the expense form. Please review them."
    );
  };

  const effectiveParticipants = useMemo(() => {
    if (participants.length === 0 && currentUserParticipant) {
      return [currentUserParticipant];
    }

    return participants;
  }, [participants, currentUserParticipant]);

  const onSubmit = async (data) => {
    try {
      const amount = parseFloat(data.amount);

     
      const formattedSplits = splits.map((split) => ({
        userId: split.userId,
        amount: split.amount,
        paid:
          split.userId === data.paidByUserId,
      }));

  
      const totalSplitAmount =
        formattedSplits.reduce(
          (sum, split) => sum + split.amount,
          0
        );

      const tolerance = 0.01;

      if (
        Math.abs(
          totalSplitAmount - amount
        ) > tolerance
      ) {
        toast.error(
          "Split amounts don't add up to the total. Please adjust your splits."
        );

        return;
      }

     
      const groupId =
        type === "individual"
          ? undefined
          : data.groupId;


      await createExpense.mutate({
        description: data.description,
        amount: amount,
        category: data.category || "Other",
        date: data.date.getTime(),
        paidByUserId: data.paidByUserId,
        splitType: data.splitType,
        splits: formattedSplits,
        groupId,
      });

      toast.success(
        "Expense created successfully!"
      );


      reset();

    
      const otherParticipant =
        effectiveParticipants.find(
          (participant) =>
            participant.id !== currentUser._id
        );

      const otherUserId =
        otherParticipant?.id;

      
      if (onSuccess) {
        onSuccess(
          type === "individual"
            ? otherUserId
            : groupId
        );
      }
    } catch (error) {
      toast.error(
        "Failed to create expense: " +
          error.message
      );
    }
  };


  if (!currentUser) {
    return null;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      {entryMode === null && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold">
              Add Expense
            </h2>

            <p className="text-sm text-muted-foreground">
              Choose how you want to enter the expense
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              type="button"
              variant="outline"
              className="h-auto py-6 flex flex-col gap-2"
              onClick={() =>
                setEntryMode("receipt")
              }
            >
              <span className="text-lg">
                📷
              </span>

              <span className="font-semibold">
                Scan Receipt
              </span>

              <span className="text-xs text-muted-foreground">
                AI will extract the expense details
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-auto py-6 flex flex-col gap-2"
              onClick={() =>
                setEntryMode("manual")
              }
            >
              <span className="text-lg">
                ✏️
              </span>

              <span className="font-semibold">
                Enter Manually
              </span>

              <span className="text-xs text-muted-foreground">
                Fill in the expense details yourself
              </span>
            </Button>
          </div>
        </div>
      )}

      {entryMode === "receipt" && (
        <div className="space-y-4">
          <ReceiptScanner
            onExtracted={
              handleReceiptExtracted
            }
          />

          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setEntryMode("manual")
            }
          >
            Enter details manually instead
          </Button>
        </div>
      )}
      {entryMode === "manual" && (
        <div className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

    
            <div className="space-y-2">
              <Label htmlFor="description">
                Description
              </Label>

              <Input
                id="description"
                placeholder="Lunch, movie tickets, etc."
                {...register("description")}
              />

              {errors.description && (
                <p className="text-sm text-red-500">
                  {errors.description.message}
                </p>
              )}
            </div>

        
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount
              </Label>

              <Input
                id="amount"
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0.01"
                {...register("amount")}
              />

              {errors.amount && (
                <p className="text-sm text-red-500">
                  {errors.amount.message}
                </p>
              )}
            </div>
          </div>

    
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      
            <div className="space-y-2">
              <Label htmlFor="category">
                Category
              </Label>

              <CategorySelector
                categories={categories || []}
                value={watch("category")}
                onChange={(categoryId) => {
                  if (categoryId) {
                    setValue("category", categoryId, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }
                }}
              />
            </div>


            <div className="space-y-2">
              <Label>Date</Label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate &&
                        "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />

                    {selectedDate ? (
                      format(
                        selectedDate,
                        "PPP"
                      )
                    ) : (
                      <span>
                        Pick a date
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (!date) return;

                      setSelectedDate(date);
                      setValue(
                        "date",
                        date
                      );
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

      
          {type === "group" && (
            <div className="space-y-2">
              <Label>Group</Label>

              <GroupSelector
                onChange={(group) => {
                  if (
                    !selectedGroup ||
                    selectedGroup.id !== group.id
                  ) {
                    setSelectedGroup(group);

                    setValue(
                      "groupId",
                      group.id
                    );

                
                    if (
                      group.members &&
                      Array.isArray(
                        group.members
                      )
                    ) {
                      setParticipants(
                        group.members
                      );
                    }
                  }
                }}
              />

              {!selectedGroup && (
                <p className="text-xs text-amber-600">
                  Please select a group to continue
                </p>
              )}
            </div>
          )}

        
          {type === "individual" && (
            <div className="space-y-2">
              <Label>Participants</Label>

              <ParticipantSelector
                participants={
                  effectiveParticipants
                }
                onParticipantsChange={
                  setParticipants
                }
              />

              {effectiveParticipants.length <=
                1 && (
                <p className="text-xs text-amber-600">
                  Please add at least one other
                  participant
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Paid by</Label>

            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register(
                "paidByUserId"
              )}
            >
              <option value="">
                Select who paid
              </option>

              {effectiveParticipants.map(
                (participant) => (
                  <option
                    key={participant.id}
                    value={participant.id}
                  >
                    {participant.id ===
                    currentUser._id
                      ? "You"
                      : participant.name}
                  </option>
                )
              )}
            </select>

            {errors.paidByUserId && (
              <p className="text-sm text-red-500">
                {
                  errors.paidByUserId
                    .message
                }
              </p>
            )}
          </div>

    
          <div className="space-y-2">
            <Label>Split type</Label>

            <Tabs
              value={splitType}
              onValueChange={(value) =>
                setValue(
                  "splitType",
                  value
                )
              }
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="equal">
                  Equal
                </TabsTrigger>

                <TabsTrigger value="percentage">
                  Percentage
                </TabsTrigger>

                <TabsTrigger value="exact">
                  Exact Amounts
                </TabsTrigger>
              </TabsList>

      
              <TabsContent
                value="equal"
                className="pt-4"
              >
                <p className="text-sm text-muted-foreground">
                  Split equally among all
                  participants
                </p>

                <SplitSelector
                  type="equal"
                  amount={
                    parseFloat(
                      amountValue
                    ) || 0
                  }
                  participants={
                    effectiveParticipants
                  }
                  paidByUserId={
                    paidByUserId
                  }
                  onSplitsChange={
                    setSplits
                  }
                />
              </TabsContent>

              
              <TabsContent
                value="percentage"
                className="pt-4"
              >
                <p className="text-sm text-muted-foreground">
                  Split by percentage
                </p>

                <SplitSelector
                  type="percentage"
                  amount={
                    parseFloat(
                      amountValue
                    ) || 0
                  }
                  participants={
                    effectiveParticipants
                  }
                  paidByUserId={
                    paidByUserId
                  }
                  onSplitsChange={
                    setSplits
                  }
                />
              </TabsContent>

    
              <TabsContent
                value="exact"
                className="pt-4"
              >
                <p className="text-sm text-muted-foreground">
                  Enter exact amounts
                </p>

                <SplitSelector
                  type="exact"
                  amount={
                    parseFloat(
                      amountValue
                    ) || 0
                  }
                  participants={
                    effectiveParticipants
                  }
                  paidByUserId={
                    paidByUserId
                  }
                  onSplitsChange={
                    setSplits
                  }
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}


      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            effectiveParticipants.length <=
              1
          }
        >
          {isSubmitting
            ? "Creating..."
            : "Create Expense"}
        </Button>
      </div>
    </form>
  );
}

