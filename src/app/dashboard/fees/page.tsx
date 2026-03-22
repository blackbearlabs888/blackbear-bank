'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function FeesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasHydrated, hydrate } = useAuthStore();
  const [paymentTypes, setPaymentTypes] = useState<Array<Record<string, unknown>>>([]);
  const [marketplaces, setMarketplaces] = useState<Array<Record<string, unknown>>>([]);
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
      const [ptRes, mpRes] = await Promise.all([
        fetch('/api/payment-types'),
        fetch('/api/marketplaces'),
      ]);
      
      const ptData = await ptRes.json();
      const mpData = await mpRes.json();
      
      if (ptData.success) setPaymentTypes(ptData.data);
      if (mpData.success) setMarketplaces(mpData.data);
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
        <h1 className="text-3xl font-bold">Fee & Platform Management</h1>
        <p className="text-muted-foreground">Kelola biaya layanan dan platform</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Types */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Types
            </CardTitle>
            <CardDescription>Daftar tipe pembayaran dan fee</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Online Fee</TableHead>
                  <TableHead>COD Fee</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentTypes.map((pt: Record<string, unknown>) => (
                  <TableRow key={pt.id as string}>
                    <TableCell className="font-medium">{pt.name as string}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{pt.onlineFeePercent}%</p>
                        <p className="text-muted-foreground">min: {formatCurrency(pt.onlineFeeFlat as number)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{pt.codFeePercent}%</p>
                        <p className="text-muted-foreground">min: {formatCurrency(pt.codFeeFlat as number)}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(pt.threshold as number)}</TableCell>
                    <TableCell>
                      <Badge variant={pt.isActive ? 'default' : 'secondary'}>
                        {pt.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Marketplaces */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Marketplace
            </CardTitle>
            <CardDescription>Pengurangan margin per marketplace</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Fee %</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marketplaces.map((mp: Record<string, unknown>) => (
                  <TableRow key={mp.id as string}>
                    <TableCell className="font-medium">{mp.name as string}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{mp.feePercent}%</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={mp.isActive ? 'default' : 'secondary'}>
                        {mp.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Fee Calculation Example */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Contoh Kalkulasi Fee</CardTitle>
          <CardDescription>Perhitungan biaya layanan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="font-medium mb-2">Kartu Kredit - Online</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Nominal &ge; Rp 1.000.000: Fee = Nominal × 10%</li>
                <li>• Nominal &lt; Rp 1.000.000: Fee = Rp 100.000 (flat)</li>
              </ul>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="font-medium mb-2">Kartu Kredit - COD</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Nominal &ge; Rp 1.000.000: Fee = Nominal × 15%</li>
                <li>• Nominal &lt; Rp 1.000.000: Fee = Rp 150.000 (flat)</li>
              </ul>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="font-medium mb-2">Pengurangan Margin (Marketplace)</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Net Margin = Payment Fee - (Nominal × Marketplace Fee %)</li>
                <li>• Contoh: Tokopedia (2%) dari Rp 1.000.000 = Rp 20.000</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
