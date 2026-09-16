import { STATUS_LABEL, STATUS_STEPS, type DonationStatus } from "@/lib/donations";
import { cn } from "@/lib/utils";

export function StatusTimeline({ status }: { status: DonationStatus }) {
  const activeIndex = STATUS_STEPS.indexOf(status);

  return (
    <ol className="mt-6 flex items-center">
      {STATUS_STEPS.map((step, index) => {
        const reached = activeIndex >= index;
        return (
          <li key={step} className="contents">
            {index > 0 && (
              <span
                className={cn(
                  "h-0.5 flex-1",
                  activeIndex >= index ? "bg-brand" : "bg-border",
                )}
              />
            )}
            <div className="flex flex-1 flex-col items-center">
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full text-xs font-semibold",
                  reached
                    ? "bg-brand text-primary-foreground"
                    : "bg-card text-muted-foreground ring-1 ring-border",
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "mt-2 text-xs",
                  reached ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {STATUS_LABEL[step]}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
