import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, MapPin, User, Car, DollarSign, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const NewBooking = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>();
  const [tripType, setTripType] = useState("one-way");
  const [step, setStep] = useState(1);

  const handleSubmit = () => {
    toast.success("預約建立成功！", {
      description: "您的行程已排定。預約編號：BK-2024-0848"
    });
    setTimeout(() => navigate("/bookings"), 1500);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>行程類型</Label>
              <RadioGroup value={tripType} onValueChange={setTripType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="one-way" id="one-way" />
                  <Label htmlFor="one-way" className="font-normal cursor-pointer">單程</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="round-trip" id="round-trip" />
                  <Label htmlFor="round-trip" className="font-normal cursor-pointer">來回</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recurring" id="recurring" />
                  <Label htmlFor="recurring" className="font-normal cursor-pointer">週期性排程</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">上車日期</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>選擇日期</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickup-time">上車時間</Label>
                <Input id="pickup-time" type="time" defaultValue="14:30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">預估時長</Label>
                <Input id="duration" placeholder="30 分鐘" />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="pickup">上車地點</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pickup"
                  placeholder="輸入地址或從常用地點選擇"
                  className="pl-10"
                  defaultValue="總部辦公室，商業街123號"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dropoff">下車地點</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="dropoff"
                  placeholder="輸入目的地地址"
                  className="pl-10"
                  defaultValue="機場第三航廈"
                />
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">預估距離</span>
                <span className="font-medium">42 公里</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">預估時長</span>
                <span className="font-medium">35-45 分鐘</span>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="passenger">乘客</Label>
              <Select defaultValue="john-chen">
                <SelectTrigger id="passenger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="john-chen">陳小明 - 業務部</SelectItem>
                  <SelectItem value="sarah-lin">林小華 - 行銷部</SelectItem>
                  <SelectItem value="michael-wang">王大維 - 工程部</SelectItem>
                  <SelectItem value="new">+ 新增乘客</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle">車型</Label>
              <Select defaultValue="sedan">
                <SelectTrigger id="vehicle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedan">轎車 (4人座) - 標準</SelectItem>
                  <SelectItem value="suv">休旅車 (6人座) - 高級</SelectItem>
                  <SelectItem value="van">廂型車 (8人座) - 團體</SelectItem>
                  <SelectItem value="luxury">豪華轎車 - 主管級</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost-center">成本中心</Label>
              <Select defaultValue="sales">
                <SelectTrigger id="cost-center">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">業務部</SelectItem>
                  <SelectItem value="marketing">行銷部</SelectItem>
                  <SelectItem value="engineering">工程部</SelectItem>
                  <SelectItem value="general">總務行政</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">特殊需求（選填）</Label>
              <Textarea
                id="notes"
                placeholder="任何特殊要求或給司機的備註..."
                className="resize-none"
              />
            </div>

            <Card className="border-primary/20 bg-gradient-primary/5">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">基本費用</span>
                    <span className="font-medium">$65</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">里程費用</span>
                    <span className="font-medium">$20</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">預估總額</span>
                    <span className="text-xl font-bold text-primary">$85</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepIcon = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return CalendarIcon;
      case 2:
        return MapPin;
      case 3:
        return DollarSign;
      default:
        return CalendarIcon;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">建立新預約</h2>
        <p className="text-muted-foreground">為您的組織安排新行程</p>
      </div>

      <div className="flex justify-between mb-8">
        {[1, 2, 3].map((s) => {
          const Icon = getStepIcon(s);
          return (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                    step >= s
                      ? "bg-gradient-primary border-primary text-primary-foreground shadow-glow"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className={cn("text-xs mt-2", step >= s ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {s === 1 ? "基本資訊" : s === 2 ? "路線" : "詳細資料"}
                </span>
              </div>
              {s < 3 && (
                <div className={cn("h-0.5 flex-1 mx-2", step > s ? "bg-primary" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            步驟 {step} / 3：{step === 1 ? "基本資訊" : step === 2 ? "路線詳情" : "乘客與費用"}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? "選擇行程類型和上車時間"
              : step === 2
              ? "輸入上車和下車地點"
              : "選擇乘客、車型並確認費用"}
          </CardDescription>
        </CardHeader>
        <CardContent>{renderStep()}</CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => step > 1 ? setStep(step - 1) : navigate("/bookings")}
        >
          {step === 1 ? "取消" : "上一步"}
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} className="bg-gradient-primary">
            下一步
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="bg-gradient-primary shadow-md hover:shadow-lg">
            建立預約
          </Button>
        )}
      </div>
    </div>
  );
};

export default NewBooking;
