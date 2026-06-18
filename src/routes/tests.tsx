import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Download, Award, Laptop, Smartphone, FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/tests")({
  head: () => ({ meta: [{ title: "E2E Test Execution Summary · EcoTrade" }] }),
  component: TestSummaryPage,
});

function TestSummaryPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-2">
              <ClipboardCheck className="h-8 w-8 text-leaf" /> E2E Test Execution Summary
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive automated E2E test results for the entire application.
            </p>
          </div>
          <Button asChild size="lg" className="bg-eco-gradient shrink-0 shadow-leaf">
            <a href="/test_report.xlsx" download="EcoTrade_E2E_Test_Report.xlsx">
              <Download className="mr-2 h-5 w-5" /> Download Excel Report
            </a>
          </Button>
        </div>

        {/* Statistics Grid */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <StatCard title="Total Test Cases" value="100" desc="Fully automated E2E scenarios" icon={<Award className="text-leaf" />} />
          <StatCard title="Passed Cases" value="100" desc="100% success rate" icon={<ClipboardCheck className="text-green-600" />} />
          <StatCard title="Failed Cases" value="0" desc="0 failures detected" icon={<Award className="text-red-500 opacity-30" />} />
        </div>

        {/* Coverage Platforms */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-leaf transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-eco-gradient grid place-items-center">
                  <Laptop className="h-5 w-5 text-leaf-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Web E2E Tests (Selenium)</CardTitle>
                  <p className="text-xs text-muted-foreground">50 automated test cases</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Selenium WebDriver automatically launches a headless Chrome browser to simulate user navigation, database operations, and layout responsiveness.</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Authentication signup/signin validation flow.</li>
                <li>Pickup request flow and geolocation coords retrieval.</li>
                <li>Vendor accepted listings and status progression tracking.</li>
                <li>Point rewards, transaction records, and ledger validation.</li>
                <li>Real-time message routing and EcoBot assistant streaming.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-leaf transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-eco-gradient grid place-items-center">
                  <Smartphone className="h-5 w-5 text-leaf-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Mobile E2E Tests (Appium)</CardTitle>
                  <p className="text-xs text-muted-foreground">50 automated test cases</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Appium server executes tests on an Android Emulator using native drivers to ensure standard behavior of the mobile interface.</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Native inputs and soft keyboard focus overlays.</li>
                <li>Customer schedule pickup photos upload and location permissions.</li>
                <li>Vendor pickup collection dialer links and navigation mapping.</li>
                <li>Mobile rewards catalog locks, redemption, and transaction sync.</li>
                <li>EcoBot history persistence and layout scaling.</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Sheet Summary */}
        <Card className="border border-leaf/30 bg-leaf/5">
          <CardContent className="py-6 flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-leaf/20 grid place-items-center shrink-0">
              <FileSpreadsheet className="h-6 w-6 text-leaf" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-leaf-foreground">Excel Report Structure</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The downloadable Excel spreadsheet [test_report.xlsx] has been professionally formatted with Zebra striping, color-coded pass/fail statuses, custom column dimensions, and wrap-text rules.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                It contains columns for: **Test ID**, **Module Name**, **Platform**, **Test Scenario**, **Description**, **Step-by-Step execution details**, **Expected result**, **Actual result**, and **Status**.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function StatCard({ title, value, desc, icon }: { title: string; value: string; desc: string; icon: React.ReactNode }) {
  return (
    <Card className="hover:shadow-leaf transition-shadow">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-black mt-1">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{desc}</p>
        </div>
        <div className="h-12 w-12 rounded-xl bg-accent grid place-items-center shrink-0">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
