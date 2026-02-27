"use client";

import { useParams } from "next/navigation";
import RanchPanel from "../RanchPanel";

export default function MvzRanchTabPage() {
  const params = useParams<{ tab: string }>();
  return <RanchPanel tab={params.tab} />;
}
