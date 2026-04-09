import { cn } from "@/lib/utils";

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return <div className={cn("p-5 pb-2", className)} {...props} />;
}

function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-sm font-semibold text-slate-800", className)} {...props} />;
}

function CardDescription({ className, ...props }) {
  return <p className={cn("text-xs text-slate-500", className)} {...props} />;
}

function CardContent({ className, ...props }) {
  return <div className={cn("p-5 pt-2", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
