import { ErrorLogPanel } from "@/components/workflow/ErrorLogPanel";

export default function ErrorsPage() {
  return (
    <div className="flex h-full -m-4">
      <ErrorLogPanel className="flex-1" />
    </div>
  );
}
