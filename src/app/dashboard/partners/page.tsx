'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Search, Users, DollarSign, TrendingUp, Loader2, Eye } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function PartnersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [partners, setPartners] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const redirectAttempted = useRef(false);

  useEffect(() => {
    if (!hasHydrated) {
      hydrate();
    }
  }, [hasHydrated, hydrate]);

  useEffect(() => {
    if (hasHydrated && !isLoading && !isAuthenticated && !redirectAttempted.current) {
      redirectAttempted.current = true;
      router.replace('/login');
    } else if (hasHydrated && !isLoading && isAuthenticated && user?.role !== 'owner' && !redirectAttempted.current) {
      redirectAttempted.current = true;
      router.replace('/dashboard');
    }
  }, [hasHydrated, isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && hasHydrated && user?.role === 'owner') {
      fetchPartners();
    }
  }, [isAuthenticated, hasHydrated, user]);

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/partners');
      const result = await response.json();
      if (result.success) {
        setPartners(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch partners:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPartners = partners.filter((p: Record<string, unknown>) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (p.name as string)?.toLowerCase().includes(searchLower) ||
      (p.email as string)?.toLowerCase().includes(searchLower) ||
      (p.phone as string)?.includes(searchLower)
    );
  });

  if (isLoading || !hasHydrated || loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'owner') return null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partner Management</h1>
          <p className="text-muted-foreground">Kelola semua mitra Black Bear</p>
        </div>
        <NewPartnerDialog onCreated={fetchPartners} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Partner</p>
                <p className="text-2xl font-bold">{partners.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Partner Aktif</p>
                <p className="text-2xl font-bold text-green-600">
                  {partners.filter((p: Record<string, unknown>) => p.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Profit Partner</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(partners.reduce((sum, p) => sum + ((p.totalProfit as number) || 0), 0))}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="glass-card">
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, email, atau no. WA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Partners Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Komisi</TableHead>
                  <TableHead>Bergabung</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.length > 0 ? (
                  filteredPartners.map((partner: Record<string, unknown>) => {
                    const progress = ((partner.totalProfit as number) / (partner.target as number)) * 100;
                    return (
                      <TableRow key={partner.id as string}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{partner.name as string}</p>
                            <p className="text-xs text-muted-foreground">{partner.email as string}</p>
                            <p className="text-xs text-muted-foreground">{partner.phone as string}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[120px]">
                            <Progress value={Math.min(progress, 100)} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatCurrency(partner.totalProfit as number)} / {formatCurrency(partner.target as number)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline">{partner.tier as string}</Badge>
                            <Badge variant="secondary" className="text-xs">{partner.badge as string}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={partner.status === 'active' ? 'default' : 'destructive'}>
                            {partner.status as string}
                          </Badge>
                        </TableCell>
                        <TableCell>{partner.commission as number}%</TableCell>
                        <TableCell className="text-sm">{formatDate(partner.joinedAt as string)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Tidak ada partner ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NewPartnerDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bankName: '',
    bankAccount: '',
    bankHolder: '',
    city: '',
    tier: 'Bronze',
    badge: 'Newbie',
    status: 'active',
    commission: '30',
    target: '5000000',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          commission: parseFloat(formData.commission),
          target: parseFloat(formData.target),
        }),
      });

      const result = await response.json();
      if (result.success) {
        setOpen(false);
        onCreated();
        setFormData({
          name: '',
          email: '',
          phone: '',
          bankName: '',
          bankAccount: '',
          bankHolder: '',
          city: '',
          tier: 'Bronze',
          badge: 'Newbie',
          status: 'active',
          commission: '30',
          target: '5000000',
        });
      }
    } catch (err) {
      console.error('Failed to create partner:', err);
    } finally {
      setLoading(false);
    }
  };

  const banks = ['BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Danamon', 'Lainnya'];
  const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
  const badges = ['Newbie', 'Rising Star', 'Champion', 'Legend'];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-white">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Partner
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Partner Baru</DialogTitle>
          <DialogDescription>Buat akun partner baru</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">No. WhatsApp</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                required
                placeholder="08xxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Kota</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Bank</Label>
              <Select
                value={formData.bankName}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, bankName: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>No. Rekening</Label>
              <Input
                value={formData.bankAccount}
                onChange={(e) => setFormData((prev) => ({ ...prev, bankAccount: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Pemilik</Label>
              <Input
                value={formData.bankHolder}
                onChange={(e) => setFormData((prev) => ({ ...prev, bankHolder: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select
                value={formData.tier}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, tier: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((tier) => (
                    <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Badge</Label>
              <Select
                value={formData.badge}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, badge: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {badges.map((badge) => (
                    <SelectItem key={badge} value={badge}>{badge}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Komisi (%)</Label>
              <Input
                type="number"
                value={formData.commission}
                onChange={(e) => setFormData((prev) => ({ ...prev, commission: e.target.value }))}
                min="0"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label>Target</Label>
              <Input
                type="number"
                value={formData.target}
                onChange={(e) => setFormData((prev) => ({ ...prev, target: e.target.value }))}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              'Tambah Partner'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
