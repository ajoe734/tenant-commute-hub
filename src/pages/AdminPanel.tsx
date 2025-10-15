import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserWithRoles {
  id: string;
  full_name: string;
  email: string;
  roles: AppRole[];
}

export default function AdminPanel() {
  const { profile } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (profile && isAdmin) {
      fetchUsers();
    }
  }, [profile, isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch all profiles in tenant
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('tenant_id', profile!.tenant_id);

      if (profilesError) throw profilesError;

      // Fetch all roles for users in tenant
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('tenant_id', profile!.tenant_id);

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRoles[] = profiles!.map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        roles: userRoles!
          .filter(r => r.user_id === p.id)
          .map(r => r.role as AppRole)
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const addRole = async (userId: string, role: AppRole) => {
    try {
      setActionLoading(`${userId}-${role}-add`);

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          tenant_id: profile!.tenant_id,
          role
        });

      if (error) throw error;

      toast.success(`Role ${role} added successfully`);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error adding role:', error);
      toast.error(error.message || 'Failed to add role');
    } finally {
      setActionLoading(null);
    }
  };

  const removeRole = async (userId: string, role: AppRole) => {
    try {
      setActionLoading(`${userId}-${role}-remove`);

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', profile!.tenant_id)
        .eq('role', role);

      if (error) throw error;

      toast.success(`Role ${role} removed successfully`);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast.error(error.message || 'Failed to remove role');
    } finally {
      setActionLoading(null);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableRoles: AppRole[] = ['admin', 'manager', 'user', 'viewer'];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage user roles and permissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users & Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Roles</TableHead>
                <TableHead>Add Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      {user.roles.length === 0 ? (
                        <Badge variant="outline">No roles</Badge>
                      ) : (
                        user.roles.map(role => (
                          <Badge key={role} variant="secondary" className="flex items-center gap-1">
                            {role}
                            <button
                              onClick={() => removeRole(user.id, role)}
                              disabled={actionLoading === `${user.id}-${role}-remove`}
                              className="ml-1 hover:text-destructive"
                            >
                              {actionLoading === `${user.id}-${role}-remove` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <UserMinus className="h-3 w-3" />
                              )}
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      onValueChange={(role) => addRole(user.id, role as AppRole)}
                      disabled={actionLoading?.startsWith(user.id)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles
                          .filter(role => !user.roles.includes(role))
                          .map(role => (
                            <SelectItem key={role} value={role}>
                              <div className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4" />
                                {role}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
