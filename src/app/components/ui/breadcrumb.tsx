import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Separator } from "./separator";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "./utils";

function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      className={cn("flex items-center gap-1.5 text-sm", className)}
      aria-label="Breadcrumb"
      {...props}
    />
  );
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return <ol className={cn("flex items-center gap-1.5", className)} {...props} />;
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("", className)} {...props} />;
}

function BreadcrumbLink({ className, asChild = false, ...props }: React.ComponentProps<"a"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      className={cn(
        "transition-colors hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("text-foreground font-normal", className)} {...props} />;
}

function BreadcrumbSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator className={cn("h-4 w-4", className)} {...props} />
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
};