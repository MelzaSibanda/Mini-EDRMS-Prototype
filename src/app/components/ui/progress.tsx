import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "./utils";

function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className,
      )}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator className="h-full w-full flex-1 bg-primary transition-all" />
    </ProgressPrimitive.Root>
  );
}

Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };