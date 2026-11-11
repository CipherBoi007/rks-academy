"use client";

import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { CircleCheck, Send, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { mobileDigits } from "@/lib/forms";
import { api, errorMessage } from "@/lib/api";
import { useWhatsAppStatus } from "@/lib/queries";
import type { WhatsAppTestResult } from "@/lib/types";

/** Confirms the WhatsApp setup with one real test message before the 1st of the month. */
export function WhatsAppPanel() {
  const status = useWhatsAppStatus();
  const [mobile, setMobile] = useState("");
  const [touched, setTouched] = useState(false);
  const valid = /^\d{10}$/.test(mobile);

  const test = useMutation({
    mutationFn: () => api<WhatsAppTestResult>("/notifications/whatsapp/test", { method: "POST", body: { mobile } }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (valid) test.mutate();
  }

  if (status.isError) {
    return (
      <Card>
        <ErrorState error={status.error} onRetry={() => status.refetch()} />
      </Card>
    );
  }
  if (!status.data) return <Skeleton className="h-64 rounded-2xl" />;
  const s = status.data;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <CardTitle>Monthly fee reminders</CardTitle>
        <p className={`mt-4 inline-flex items-center gap-2 font-semibold ${s.live ? "text-primary" : "text-alert-700"}`}>
          {s.live ? <CircleCheck className="h-5 w-5" aria-hidden /> : <TriangleAlert className="h-5 w-5" aria-hidden />}
          {s.live ? "Sending through WhatsApp" : "Recording only: nothing is sent yet"}
        </p>
        <dl className="mt-4 space-y-2 text-[15px]">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Schedule</dt>
            <dd>1st of every month, 9:00 AM</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Template</dt>
            <dd>
              {s.templateName} ({s.templateLanguage})
            </dd>
          </div>
        </dl>
        {s.issues.length > 0 && (
          <ul className="mt-4 space-y-2 rounded-xl bg-alert-50 p-3 text-sm text-alert-700">
            {s.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <CardTitle>Send a test</CardTitle>
        <p className="mt-2 text-[15px] text-muted">Sends one sample reminder to your own number, using the real template.</p>
        <form onSubmit={submit} noValidate className="mt-4 space-y-4">
          <Field id="wa-test" label="Mobile number" error={touched && !valid ? "Enter a 10-digit mobile number" : undefined}>
            <Input
              id="wa-test"
              type="tel"
              inputMode="numeric"
              prefix="+91"
              value={mobile}
              onChange={(e) => setMobile(mobileDigits(e.target.value))}
              invalid={touched && !valid}
            />
          </Field>
          <Button type="submit" icon={<Send className="h-4 w-4" aria-hidden />} loading={test.isPending}>
            Send test message
          </Button>
        </form>
        {test.isError && (
          <p role="alert" className="mt-4 rounded-xl bg-alert-50 p-3 text-sm text-alert-700">
            {errorMessage(test.error)}
          </p>
        )}
        {test.data && (
          <div role="status" className={`mt-4 rounded-xl p-3 text-sm ${test.data.ok ? "bg-primary-50 text-primary-700" : "bg-alert-50 text-alert-700"}`}>
            <p className="font-semibold">
              {test.data.ok
                ? test.data.provider === "cloud"
                  ? "Sent. Check the phone for the message."
                  : "Recorded (not sent: the provider is set to log only)."
                : `Not sent: ${test.data.error}`}
            </p>
            <p className="mt-2 text-ink/80">{test.data.preview}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
