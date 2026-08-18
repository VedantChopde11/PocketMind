"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function ExpenseSummary({ monthlySpending, totalSpent }) {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  
  const chartData =
    monthlySpending?.map((item) => {
      const date = new Date(item.month);

      return {
        name: monthNames[date.getMonth()],
        amount: Number(item.total) || 0,
      };
    }) || [];

  
  const currentMonthSpending = monthlySpending?.find((item) => {
    const date = new Date(item.month);

    return (
      date.getFullYear() === currentYear &&
      date.getMonth() === currentMonth
    );
  });

  const thisMonthTotal = currentMonthSpending?.total || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Expense Summary
        </CardTitle>
      </CardHeader>

      <CardContent>
       
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Total this month
            </p>

            <p className="text-2xl font-semibold mt-1">
              ₹{Number(thisMonthTotal).toFixed(2)}
            </p>
          </div>

        
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Total this year
            </p>

            <p className="text-2xl font-semibold mt-1">
              ₹{Number(totalSpent || 0).toFixed(2)}
            </p>
          </div>
        </div>

      
        <div className="h-64 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis dataKey="name" />

              <YAxis />

              <Tooltip
                formatter={(value) => [
                  `₹${Number(value).toFixed(2)}`,
                  "Amount",
                ]}
                labelFormatter={(label) => label}
              />

              <Bar
                dataKey="amount"
                fill="#36d7b7"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

       
        <p className="text-xs text-muted-foreground text-center mt-2">
          Monthly spending for {currentYear}
        </p>
      </CardContent>
    </Card>
  );
}