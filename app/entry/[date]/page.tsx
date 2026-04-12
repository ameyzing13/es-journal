import JournalPage from "@/components/JournalPage";

export default async function EntryPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return <JournalPage date={date} />;
}
