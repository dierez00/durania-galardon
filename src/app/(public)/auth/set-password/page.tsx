import { Suspense } from "react";
import { SetPasswordPage } from "@/modules/auth";

function SetPasswordPageLoading() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-6">
			<p className="text-sm text-muted-foreground">Cargando formulario...</p>
		</div>
	);
}

export default function SetPasswordRoutePage() {
	return (
		<Suspense fallback={<SetPasswordPageLoading />}>
			<SetPasswordPage />
		</Suspense>
	);
}
