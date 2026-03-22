'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Megaphone, ExternalLink, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function BroadcastPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Array<Record<string, unknown>>>([]);
  const [promos, setPromos] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
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
      fetchData();
    }
  }, [isAuthenticated, hasHydrated, user]);

  const fetchData = async () => {
    try {
      const [aRes, pRes] = await Promise.all([
        fetch('/api/announcements'),
        fetch('/api/promos'),
      ]);
      
      const aData = await aRes.json();
      const pData = await pRes.json();
      
      if (aData.success) setAnnouncements(aData.data);
      if (pData.success) setPromos(pData.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

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
      <div>
        <h1 className="text-3xl font-bold">Broadcast</h1>
        <p className="text-muted-foreground">Kirim announcement dan promo ke partner</p>
      </div>

      <Tabs defaultValue="announcements" className="space-y-6">
        <TabsList>
          <TabsTrigger value="announcements">
            <Megaphone className="w-4 h-4 mr-2" />
            Announcement
          </TabsTrigger>
          <TabsTrigger value="promos">
            <ExternalLink className="w-4 h-4 mr-2" />
            Promo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Announcement</CardTitle>
                <CardDescription>Broadcast informasi ke seluruh partner</CardDescription>
              </div>
              <NewAnnouncementDialog onCreated={fetchData} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.length > 0 ? (
                    announcements.map((a: Record<string, unknown>) => (
                      <TableRow key={a.id as string}>
                        <TableCell className="font-medium">{a.title as string}</TableCell>
                        <TableCell className="max-w-xs truncate">{a.description as string}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(a.startDate as string)} - {formatDate(a.expireDate as string)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={a.isActive ? 'default' : 'secondary'}>
                            {a.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Belum ada announcement
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promos">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Promo</CardTitle>
                <CardDescription>Broadcast promo ke seluruh partner</CardDescription>
              </div>
              <NewPromoDialog onCreated={fetchData} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promos.length > 0 ? (
                    promos.map((p: Record<string, unknown>) => (
                      <TableRow key={p.id as string}>
                        <TableCell className="font-medium">{p.title as string}</TableCell>
                        <TableCell>
                          <a 
                            href={p.link as string} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm truncate max-w-xs block"
                          >
                            {p.link as string}
                          </a>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(p.startDate as string)} - {formatDate(p.expireDate as string)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.isActive ? 'default' : 'secondary'}>
                            {p.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Belum ada promo
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NewAnnouncementDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    expireDate: '',
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        setOpen(false);
        onCreated();
        setFormData({ title: '', description: '', startDate: '', expireDate: '', isActive: true });
      }
    } catch (err) {
      console.error('Failed to create announcement:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-white">
          <Plus className="w-4 h-4 mr-2" />
          Tambah
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Announcement Baru</DialogTitle>
          <DialogDescription>Buat announcement untuk partner</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Judul</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Expire</Label>
              <Input
                type="datetime-local"
                value={formData.expireDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, expireDate: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
            />
            <Label>Aktif</Label>
          </div>
          <Button type="submit" className="w-full gradient-primary text-white" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Buat Announcement
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewPromoDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    link: '',
    startDate: '',
    expireDate: '',
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        setOpen(false);
        onCreated();
        setFormData({ title: '', link: '', startDate: '', expireDate: '', isActive: true });
      }
    } catch (err) {
      console.error('Failed to create promo:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-white">
          <Plus className="w-4 h-4 mr-2" />
          Tambah
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promo Baru</DialogTitle>
          <DialogDescription>Buat promo untuk partner</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Judul</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Link (Canva/GDrive)</Label>
            <Input
              type="url"
              value={formData.link}
              onChange={(e) => setFormData((prev) => ({ ...prev, link: e.target.value }))}
              required
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Expire</Label>
              <Input
                type="datetime-local"
                value={formData.expireDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, expireDate: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
            />
            <Label>Aktif</Label>
          </div>
          <Button type="submit" className="w-full gradient-primary text-white" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Buat Promo
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
