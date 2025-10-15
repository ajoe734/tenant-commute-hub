import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Report {
  id: string;
  name: string;
  report_type: string;
  format: string;
  file_url: string | null;
  last_run_at: string | null;
  created_at: string;
}

const ReportManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [profile]);

  const fetchReports = async () => {
    if (!profile?.tenant_id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "載入失敗",
        description: "無法載入報表資料",
        variant: "destructive",
      });
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  const generateReport = async (type: "monthly_trips" | "department_cost" | "invoice_summary") => {
    if (!profile?.tenant_id) return;

    toast({
      title: "產生報表中",
      description: "報表正在背景產生，請稍候...",
    });

    try {
      // Create report record
      const { data: newReport, error: insertError } = await supabase
        .from("reports")
        .insert([
          {
            tenant_id: profile.tenant_id,
            name: `${getReportTypeLabel(type)} - ${format(new Date(), "yyyy-MM-dd")}`,
            report_type: type,
            format: "csv" as const,
            created_by: profile.id,
          },
        ])
        .select()
        .single();

      if (insertError || !newReport) {
        throw insertError || new Error("Failed to create report");
      }

      // Trigger report generation edge function
      const { error: functionError } = await supabase.functions.invoke(
        "generate-report",
        {
          body: { report_id: newReport.id },
        }
      );

      if (functionError) {
        console.error("Report generation error:", functionError);
        toast({
          title: "產生失敗",
          description: functionError.message,
          variant: "destructive",
        });
      } else {
        toast({ 
          title: "報表已產生",
          description: "報表產生完成，可在列表中下載"
        });
        fetchReports();
      }
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast({
        title: "產生失敗",
        description: error.message || "發生未知錯誤",
        variant: "destructive",
      });
    }
  };

  const getReportTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      monthly_trips: "月度趟次統計",
      department_cost: "部門成本分析",
      invoice_summary: "發票彙總報表",
    };
    return types[type] || type;
  };

  const downloadReport = (url: string | null) => {
    if (!url) {
      toast({
        title: "下載失敗",
        description: "報表檔案尚未產生",
        variant: "destructive",
      });
      return;
    }
    window.open(url, "_blank");
  };

  const quickReports: Array<{
    type: "monthly_trips" | "department_cost" | "invoice_summary";
    label: string;
    icon: typeof Calendar | typeof TrendingUp | typeof FileText;
  }> = [
    { type: "monthly_trips", label: "月度趟次統計", icon: Calendar },
    { type: "department_cost", label: "部門成本分析", icon: TrendingUp },
    { type: "invoice_summary", label: "發票彙總報表", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">報表下載</h2>
        <p className="text-muted-foreground">產生並下載各類營運報表</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickReports.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.type} className="hover:shadow-md transition-all cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Icon className="h-8 w-8 text-primary" />
                  <Button
                    size="sm"
                    onClick={() => generateReport(report.type)}
                    className="bg-gradient-primary"
                  >
                    產生
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold text-foreground">{report.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  即時產生最新數據
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            歷史報表
          </CardTitle>
          <CardDescription>已產生的報表檔案</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              尚無報表記錄，點擊上方「產生」按鈕建立報表
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>報表名稱</TableHead>
                  <TableHead>類型</TableHead>
                  <TableHead>格式</TableHead>
                  <TableHead>產生時間</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.name}</TableCell>
                    <TableCell>{getReportTypeLabel(report.report_type)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.format.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {report.last_run_at
                        ? format(new Date(report.last_run_at), "yyyy-MM-dd HH:mm")
                        : format(new Date(report.created_at), "yyyy-MM-dd HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={report.file_url ? "default" : "secondary"}>
                        {report.file_url ? "完成" : "處理中"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadReport(report.file_url)}
                        disabled={!report.file_url}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        下載
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportManagement;
