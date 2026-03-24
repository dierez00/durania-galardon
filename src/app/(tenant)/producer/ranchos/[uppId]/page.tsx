import { redirect } from "next/navigation";

interface ProducerLegacyRanchoDetailPageProps {
  params: Promise<{ uppId: string }>;
}

export default async function ProducerLegacyRanchoDetailPage({
  params,
}: ProducerLegacyRanchoDetailPageProps) {
  const { uppId } = await params;
  redirect(`/producer/projects/${uppId}`);
}
