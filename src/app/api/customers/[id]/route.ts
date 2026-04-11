import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateWhatsApp, formatWhatsApp } from '@/lib/calculations'
import { getAuthenticatedUser, isOwner, isPartner } from '@/lib/auth-helpers'

// GET /api/customers/[id] - Get customer detail with stats
// Owner can see any customer
// Partner can only see their own customers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get authenticated user
    const authUser = await getAuthenticatedUser(request)
    
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        partner: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        transactions: {
          include: {
            paymentType: true,
            marketplace: true,
            partner: {
              include: {
                user: {
                  select: {
                    name: true,
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }
      }
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer tidak ditemukan' },
        { status: 404 }
      )
    }

    // Role-based access control
    if (isPartner(authUser)) {
      // Partner can only see their own customers
      if (customer.partnerId !== authUser.partnerId) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        )
      }
    }
    // Owner can see any customer

    // Calculate stats from transactions
    const completedTransactions = customer.transactions.filter(t => t.status === 'COMPLETED')
    const totalContribution = completedTransactions.reduce((sum, t) => sum + t.ownerProfit, 0)
    const totalVolume = completedTransactions.reduce((sum, t) => sum + t.nominal, 0)
    const totalTransactions = completedTransactions.length

    // Get all-time stats from database
    const allTimeStats = await db.transaction.aggregate({
      where: {
        customerId: id,
        status: 'COMPLETED'
      },
      _sum: {
        ownerProfit: true,
        nominal: true,
      },
      _count: true
    })

    return NextResponse.json({
      success: true,
      data: {
        ...customer,
        stats: {
          totalContribution: allTimeStats._sum.ownerProfit || 0,
          totalVolume: allTimeStats._sum.nominal || 0,
          totalTransactions: allTimeStats._count || 0,
        },
        recentTransactions: customer.transactions.slice(0, 10),
      }
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

// PATCH /api/customers/[id] - Update customer
// Owner can update any customer and assign to any partner
// Partner can only update their own customers (cannot change partnerId)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get authenticated user
    const authUser = await getAuthenticatedUser(request)
    
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { name, whatsapp, bank, accountNumber, accountHolder, city, label, partnerId } = body

    // Check if customer exists
    const existingCustomer = await db.customer.findUnique({
      where: { id }
    })

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Customer tidak ditemukan' },
        { status: 404 }
      )
    }

    // Role-based access control
    if (isPartner(authUser)) {
      // Partner can only update their own customers
      if (existingCustomer.partnerId !== authUser.partnerId) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        )
      }
      // Partner cannot change partnerId
      if (partnerId !== undefined && partnerId !== authUser.partnerId) {
        return NextResponse.json(
          { success: false, error: 'Cannot reassign customer to another partner' },
          { status: 403 }
        )
      }
    }
    // Owner can update any customer and change partnerId

    // If updating WhatsApp, validate and check for duplicates
    let formattedWa = existingCustomer.whatsapp
    if (whatsapp && whatsapp !== existingCustomer.whatsapp) {
      formattedWa = formatWhatsApp(whatsapp)
      if (!validateWhatsApp(formattedWa)) {
        return NextResponse.json(
          { success: false, error: 'Format No WhatsApp tidak valid (contoh: 08xxxxxxxxxx)' },
          { status: 400 }
        )
      }

      const duplicateWa = await db.customer.findFirst({
        where: {
          whatsapp: formattedWa,
          NOT: { id }
        }
      })

      if (duplicateWa) {
        return NextResponse.json(
          { success: false, error: 'No WhatsApp sudah terdaftar' },
          { status: 400 }
        )
      }
    }

    // Validate bank info if provided
    if (bank && (!accountNumber || !accountHolder)) {
      return NextResponse.json(
        { success: false, error: 'Jika mengisi Bank, No Rekening dan Nama Pemilik wajib diisi' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (whatsapp !== undefined) updateData.whatsapp = formattedWa
    if (bank !== undefined) updateData.bank = bank || null
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber || null
    if (accountHolder !== undefined) updateData.accountHolder = accountHolder || null
    if (city !== undefined) updateData.city = city || null
    if (label !== undefined) updateData.label = label
    // Only owner can change partnerId
    if (partnerId !== undefined && isOwner(authUser)) updateData.partnerId = partnerId || null

    // Update customer
    const customer = await db.customer.update({
      where: { id },
      data: updateData,
      include: {
        partner: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer berhasil diperbarui'
    })
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - Delete customer (or blacklist)
// Owner can delete/blacklist any customer
// Partner can only blacklist their own customers
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') // 'delete' or 'blacklist'
    
    // Get authenticated user
    const authUser = await getAuthenticatedUser(request)
    
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if customer exists
    const existingCustomer = await db.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    })

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Customer tidak ditemukan' },
        { status: 404 }
      )
    }

    // Role-based access control
    if (isPartner(authUser)) {
      // Partner can only blacklist their own customers
      if (existingCustomer.partnerId !== authUser.partnerId) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        )
      }
      // Partner cannot delete, only blacklist
      if (action === 'delete') {
        return NextResponse.json(
          { success: false, error: 'Partners can only blacklist customers, not delete them' },
          { status: 403 }
        )
      }
    }

    // If customer has transactions, blacklist instead of delete
    if (existingCustomer._count.transactions > 0 || action === 'blacklist') {
      const customer = await db.customer.update({
        where: { id },
        data: { label: 'BLACKLIST' }
      })

      return NextResponse.json({
        success: true,
        data: customer,
        message: 'Customer telah di-blacklist'
      })
    }

    // Delete customer if no transactions (only owner can reach here)
    await db.customer.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Customer berhasil dihapus'
    })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
}
