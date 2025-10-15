import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Download, DollarSign, Calendar, TrendingUp } from "lucide-react";
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

interface Invoice {
  id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  tax_amount: number | null;
  paid_at: string | null;
  pdf_url: string | null;
  created_at: string;
}

const BillingManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    currentMonth: 0,
    lastMonth: 0,
    unpaidTotal: 0,
  });

  useEffect(() => {
    fetchInvoices();
  }, [profile]);

  const fetchInvoices = async () => {
    if (!profile?.tenant_id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("period_end", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "載入失敗",
        description: "無法載入發票資料",
        variant: "destructive",
      });
    } else {
      setInvoices(data || []);
      calculateStats(data || []);
    }
    setLoading(false);
  };

  const calculateStats = (invoices: Invoice[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthTotal = invoices
      .filter((inv) => {
        const date = new Date(inv.period_end);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0);

    const lastMonthTotal = invoices
      .filter((inv) => {
        const date = new Date(inv.period_end);
        return date.getMonth() === currentMonth - 1 && date.getFullYear() === currentYear;
      })
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0);

    const unpaidTotal = invoices
      .filter((inv) => !inv.paid_at)
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0);

    setStats({
      currentMonth: currentMonthTotal,
      lastMonth: lastMonthTotal,
      unpaidTotal,
    });
  };

  const downloadInvoice = (url: string | null) => {
    if (!url) {
      toast({
        title: "下載失敗",
        description: "發票檔案尚未產生",
        variant: "destructive",
      });
      return;
    }
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">付款與發票</h2>
        <p className="text-muted-foreground">管理您的帳務與發票記錄</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">本月費用</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${stats.currentMonth.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp
                className={`mr-1 h-3 w-3 ${
                  stats.currentMonth >= stats.lastMonth
                    ? "text-success"
                    : "text-destructive rotate-180"
                }`}
              />
              <span>較上月</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">上月費用</CardTitle>
            <Calendar className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${stats.lastMonth.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">已結算</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">未付款</CardTitle>
            <CreditCard className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${stats.unpaidTotal.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">待處理</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            發票記錄
          </CardTitle>
          <CardDescription>您的歷史發票與付款狀態</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              尚無發票記錄
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>發票號碼</TableHead>
                  <TableHead>計費週期</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>稅額</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>付款時間</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(invoice.period_start), "yyyy-MM-dd")} -{" "}
                      {format(new Date(invoice.period_end), "yyyy-MM-dd")}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${Number(invoice.total_amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.tax_amount ? `$${Number(invoice.tax_amount).toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={invoice.paid_at ? "default" : "destructive"}>
                        {invoice.paid_at ? "已付款" : "未付款"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.paid_at
                        ? format(new Date(invoice.paid_at), "yyyy-MM-dd HH:mm")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadInvoice(invoice.pdf_url)}
                        disabled={!invoice.pdf_url}
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

export default BillingManagement;
