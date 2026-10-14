import * as React from "react";
import { cn } from "./utils";

const SidebarContext = React.createContext<{
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
} | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function SidebarProvider({
  children,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
}: SidebarProviderProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [state, setState] = React.useState<"expanded" | "collapsed">("expanded");

  const isControlled = controlledOpen !== undefined;

  const setOpenWithCallback = React.useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const newOpen = typeof value === "function" ? value(open) : value;
      if (!isControlled) {
        setOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [open, isControlled, onOpenChange],
  );

  const toggle = React.useCallback(() => setOpenWithCallback((prev) => !prev), [setOpenWithCallback]);

  return (
    <SidebarContext.Provider value={{ state, open: isControlled ? controlledOpen : open, setOpen: setOpenWithCallback, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

interface SidebarProps extends React.ComponentProps<"aside"> {
  side?: "left" | "right";
}

function Sidebar({ className, side = "left", ...props }: SidebarProps) {
  const { state } = useSidebar();

  return (
    <aside
      data-slot="sidebar"
      data-state={state}
      data-side={side}
      className={cn(
        "fixed z-40 flex h-svh w-[var(--sidebar-width)] flex-col bg-sidebar transition-[width,height] duration-200 ease-linear",
        side === "left" ? "left-0 border-r border-sidebar-border" : "right-0 border-l border-sidebar-border",
        state === "collapsed" && "w-[var(--sidebar-collapsed-width)]",
        className,
      )}
      {...props}
    />
  );
}

Sidebar.displayName = "Sidebar";

function SidebarTrigger({ className, ...props }: React.ComponentProps<"button">) {
  const { toggle } = useSidebar();

  return (
    <button
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors",
        className,
      )}
      onClick={toggle}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="18" y2="18" />
      </svg>
    </button>
  );
}

SidebarTrigger.displayName = "SidebarTrigger";

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggle, state } = useSidebar();

  return (
    <button
      className={cn(
        "absolute z-50 flex h-full w-[3px] items-center justify-center bg-sidebar-border/50 hover:bg-sidebar-border transition-colors",
        state === "collapsed" && "bg-sidebar-border",
        className,
      )}
      onClick={toggle}
      style={{ left: "calc(var(--sidebar-width) - 1.5px)" }}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}

SidebarRail.displayName = "SidebarRail";

function SidebarInset({ className, ...props }: React.ComponentProps<"div">) {
  const { state } = useSidebar();

  return (
    <div
      className={cn(
        "flex flex-1 min-w-0 transition-[margin] duration-200 ease-linear",
        state === "collapsed" ? "ml-[var(--sidebar-collapsed-width)]" : "ml-[var(--sidebar-width)]",
        className,
      )}
      {...props}
    />
  );
}

SidebarInset.displayName = "SidebarInset";

function SidebarInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-9 w-[--sidebar-width] rounded-md border-transparent bg-transparent px-3 py-1 text-sm shadow-none focus:outline-none focus:ring-0 focus:bg-accent placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

SidebarInput.displayName = "SidebarInput";

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-2 p-4", className)} {...props} />
  );
}

SidebarHeader.displayName = "SidebarHeader";

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-2 p-4", className)} {...props} />
  );
}

SidebarFooter.displayName = "SidebarFooter";

function SidebarSeparator({ className, ...props }: React.ComponentProps<"hr">) {
  return <hr className={cn("mx-2 border-border", className)} {...props} />;
}

SidebarSeparator.displayName = "SidebarSeparator";

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-1 overflow-y-auto px-3", className)} {...props} />
  );
}

SidebarContent.displayName = "SidebarContent";

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1", className)} {...props} />;
}

SidebarGroup.displayName = "SidebarGroup";

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  const { state } = useSidebar();

  return (
    <div
      className={cn(
        "px-3 py-1.5 text-xs font-semibold text-muted-foreground/70",
        state === "collapsed" && "hidden",
        className,
      )}
      {...props}
    />
  );
}

SidebarGroupLabel.displayName = "SidebarGroupLabel";

function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1", className)} {...props} />;
}

SidebarGroupContent.displayName = "SidebarGroupContent";

interface SidebarMenuItemProps extends React.ComponentProps<"a"> {
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

function SidebarMenuItem({
  className,
  icon,
  badge,
  disabled = false,
  children,
  onClick,
  ...props
}: SidebarMenuItemProps) {
  const { state } = useSidebar();

  return (
    <a
      className={cn(
        "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium transition-colors outline-none focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
        state === "collapsed" && "justify-center px-2",
        className,
      )}
      onClick={(e) => {
        if (disabled) e.preventDefault();
        onClick?.(e);
      }}
      {...props}
    >
      {icon && <span className={cn("shrink-0 size-4", state === "collapsed" && "mx-auto")}>{icon}</span>}
      <span className={cn("truncate", state === "collapsed" && "hidden")}>{children}</span>
      {badge && <span className={cn("ml-auto shrink-0", state === "collapsed" && "hidden")}>{badge}</span>}
    </a>
  );
}

SidebarMenuItem.displayName = "SidebarMenuItem";

function SidebarMenuButton({
  className,
  icon,
  badge,
  disabled = false,
  children,
  onClick,
  ...props
}: Omit<SidebarMenuItemProps, "href">) {
  const { state } = useSidebar();

  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium text-left transition-colors outline-none focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
        state === "collapsed" && "justify-center px-2",
        className,
      )}
      onClick={(e) => {
        if (disabled) e.preventDefault();
        onClick?.(e);
      }}
      disabled={disabled}
      {...props}
    >
      {icon && <span className={cn("shrink-0 size-4", state === "collapsed" && "mx-auto")}>{icon}</span>}
      <span className={cn("truncate", state === "collapsed" && "hidden")}>{children}</span>
      {badge && <span className={cn("ml-auto shrink-0", state === "collapsed" && "hidden")}>{badge}</span>}
    </button>
  );
}

SidebarMenuButton.displayName = "SidebarMenuButton";

interface SidebarMenuSubProps {
  children: React.ReactNode;
}

function SidebarMenuSub({ children }: SidebarMenuSubProps) {
  const { state } = useSidebar();

  return (
    <div
      className={cn(
        "flex flex-col gap-1 pl-2",
        state === "collapsed" && "hidden",
      )}
    >
      {children}
    </div>
  );
}

SidebarMenuSub.displayName = "SidebarMenuSub";

export {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  SidebarInput,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  useSidebar,
};