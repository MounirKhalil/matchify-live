import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { JOB_CATEGORIES } from "@/constants/jobCategories";

interface CategorySelectorProps {
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  label?: string;
  description?: string;
  required?: boolean;
}

export const CategorySelector = ({
  selectedCategories,
  onCategoryToggle,
  label = "Categories",
  description,
  required = false,
}: CategorySelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = JOB_CATEGORIES.filter((category) =>
    category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && "*"}
      </Label>
      {description && (
        <p className="text-sm text-muted-foreground mb-2">{description}</p>
      )}
      
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category List */}
      <ScrollArea className="h-[200px] rounded-md border p-4">
        <div className="grid grid-cols-2 gap-3">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <div key={category} className="flex items-center space-x-2">
                <Checkbox
                  id={category}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={() => onCategoryToggle(category)}
                />
                <label
                  htmlFor={category}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {category}
                </label>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
              No categories found
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Selected Categories */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedCategories.map((category) => (
            <Badge key={category} variant="secondary" className="gap-1">
              {category}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onCategoryToggle(category)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
