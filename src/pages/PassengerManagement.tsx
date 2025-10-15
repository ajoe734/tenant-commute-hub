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
import { Plus, Pencil, Trash2 } from 'lucide-react';

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
        title: 'Error',
        description: 'Failed to load passengers',
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
          title: 'Success',
          description: 'Passenger updated successfully',
        });
      } else {
        const { error } = await supabase.from('passengers').insert({
          ...formData,
          tenant_id: profile.tenant_id,
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Passenger added successfully',
        });
      }

      setDialogOpen(false);
      setEditingPassenger(null);
      setFormData({ name: '', phone: '', email: '', department: '', notes: '' });
      fetchPassengers();
    } catch (error: any) {
      console.error('Error saving passenger:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save passenger',
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
    if (!confirm('Are you sure you want to deactivate this passenger?')) return;

    try {
      const { error } = await supabase
        .from('passengers')
        .update({ is_active: false })
        .eq('id', passengerId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Passenger deactivated successfully',
      });
      fetchPassengers();
    } catch (error: any) {
      console.error('Error deactivating passenger:', error);
      toast({
        title: 'Error',
        description: 'Failed to deactivate passenger',
        variant: 'destructive',
      });
    }
  };

  if (!canManagePassengers) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                You don't have permission to manage passengers.
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
              <CardTitle>Passenger Management</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingPassenger(null);
                    setFormData({ name: '', phone: '', email: '', department: '', notes: '' });
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Passenger
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingPassenger ? 'Edit Passenger' : 'Add New Passenger'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit">Save</Button>
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : passengers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No passengers found. Add your first passenger to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passengers.map((passenger) => (
                    <TableRow key={passenger.id}>
                      <TableCell>{passenger.name}</TableCell>
                      <TableCell>{passenger.phone}</TableCell>
                      <TableCell>{passenger.email || '-'}</TableCell>
                      <TableCell>{passenger.department || '-'}</TableCell>
                      <TableCell>{passenger.is_active ? 'Active' : 'Inactive'}</TableCell>
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
