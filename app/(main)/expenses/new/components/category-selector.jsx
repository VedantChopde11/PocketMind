"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CategorySelector({ categories, onChange }) {
  const [selectedCategory, setSelectedCategory] = useState("");


  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);

  
    if (onChange && categoryId !== selectedCategory) {
      onChange(categoryId);
    }
  };

 
  if (!categories || categories.length === 0) {
    return <div>No categories available</div>;
  }

  if (!selectedCategory && categories.length > 0) {
    
    const defaultCategory =
      categories.find((cat) => cat.isDefault) || categories[0];

  
    setTimeout(() => {
      setSelectedCategory(defaultCategory.id);
      if (onChange) {
        onChange(defaultCategory.id);
      }
    }, 0);
  }

  return (
    <Select value={selectedCategory} onValueChange={handleCategoryChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a category" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <div className="flex items-center gap-2">
              <span>{category.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}