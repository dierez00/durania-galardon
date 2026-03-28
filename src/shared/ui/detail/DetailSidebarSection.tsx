import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

interface DetailSidebarSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DetailSidebarSection({
  title,
  children,
  className,
  contentClassName,
}: Readonly<DetailSidebarSectionProps>) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
