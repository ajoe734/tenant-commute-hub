import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Pencil, Trash2, Database } from 'lucide-react';

interface Passenger {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  department: string | null;
  notes: string | null;
  is_active: boolean;
}

export default function PassengerManagement() {
  const { profile } = useAuth();
  const { canManagePassengers } = useUserRole();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null);
  const [generatingDemo, setGeneratingDemo] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    department: '',
    notes: '',
  });

  useEffect(() => {
    fetchPassengers();
  }, [profile]);

  const fetchPassengers = async () => {
    if (!profile?.tenant_id) return;

    try {
      const { data, error } = await supabase
        .from('passengers')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('name');

      if (error) throw error;
      setPassengers(data || []);
    } catch (error: any) {
      console.error('Error fetching passengers:', error);
      toast({
        title: '錯誤',
        description: '無法載入乘客資料',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    try {
      if (editingPassenger) {
        const { error } = await supabase
          .from('passengers')
          .update(formData)
          .eq('id', editingPassenger.id);

        if (error) throw error;

        toast({
          title: '成功',
          description: '乘客更新成功',
        });
      } else {
        const { error } = await supabase.from('passengers').insert({
          ...formData,
          tenant_id: profile.tenant_id,
        });

        if (error) throw error;

        toast({
          title: '成功',
          description: '乘客新增成功',
        });
      }

      setDialogOpen(false);
      setEditingPassenger(null);
      setFormData({ name: '', phone: '', email: '', department: '', notes: '' });
      fetchPassengers();
    } catch (error: any) {
      console.error('Error saving passenger:', error);
      toast({
        title: '錯誤',
        description: error.message || '無法儲存乘客',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (passenger: Passenger) => {
    setEditingPassenger(passenger);
    setFormData({
      name: passenger.name,
      phone: passenger.phone,
      email: passenger.email || '',
      department: passenger.department || '',
      notes: passenger.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (passengerId: string) => {
    if (!confirm('確定要停用此乘客嗎？')) return;

    try {
      const { error } = await supabase
        .from('passengers')
        .update({ is_active: false })
        .eq('id', passengerId);

      if (error) throw error;

      toast({
        title: '成功',
        description: '乘客已成功停用',
      });
      fetchPassengers();
    } catch (error: any) {
      console.error('Error deactivating passenger:', error);
      toast({
        title: '錯誤',
        description: '無法停用乘客',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateDemoData = async () => {
    setGeneratingDemo(true);
    try {
      const { error } = await supabase.functions.invoke('seed-demo-data');

      if (error) throw error;

      toast({
        title: '成功',
        description: 'Demo 資料已建立',
      });

      fetchPassengers();
    } catch (error: any) {
      console.error('Error generating demo data:', error);
      toast({
        title: '錯誤',
        description: error.message || '建立 Demo 資料失敗',
        variant: 'destructive',
      });
    } finally {
      setGeneratingDemo(false);
    }
  };

  if (!canManagePassengers) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                您沒有權限管理乘客。
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>乘客管理</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  管理公司內部的乘客資料
                </p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingPassenger(null);
                    setFormData({ name: '', phone: '', email: '', department: '', notes: '' });
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    新增乘客
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingPassenger ? '編輯乘客' : '新增乘客'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">姓名 *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">電話 *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">電子郵件</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="department">部門</Label>
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">備註</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit">儲存</Button>
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        取消
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">載入中...</div>
            ) : passengers.length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  尚無乘客資料
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleGenerateDemoData}
                  disabled={generatingDemo}
                >
                  <Database className="mr-2 h-4 w-4" />
                  {generatingDemo ? '產生中...' : '產生 Demo 資料'}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>電話</TableHead>
                    <TableHead>電子郵件</TableHead>
                    <TableHead>部門</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passengers.map((passenger) => (
                    <TableRow key={passenger.id}>
                      <TableCell>{passenger.name}</TableCell>
                      <TableCell>{passenger.phone}</TableCell>
                      <TableCell>{passenger.email || '-'}</TableCell>
                      <TableCell>{passenger.department || '-'}</TableCell>
                      <TableCell>{passenger.is_active ? '啟用' : '停用'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(passenger)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {passenger.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(passenger.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
