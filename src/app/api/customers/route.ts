import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateWhatsApp, formatWhatsApp } from '@/lib/calculations'
import { getAuthenticatedUser, isOwner, isPartner } from '@/lib/auth-helpers'

// GET /api/customers - List customers with pagination and filters
// Owner can see ALL customers
// Partner can only see customers they added (partnerId = their partner ID) in customer page
// Partner can search ALL customers in transaction page (with searchAll=true parameter)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const label = searchParams.get('label')
    const city = searchParams.get('city')
    const search = searchParams.get('search')
    const queryPartnerId = searchParams.get('partnerId')
    const searchAll = searchParams.get('searchAll') === 'true' // Allow partner to search all customers
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const skip = (page - 1) * pageSize

    // Get authenticated user
    const authUser = await getAuthenticatedUser(request)
    
    // Build where clause
    const where: Record<string, unknown> = {}
    
    // Role-based filtering
    if (isPartner(authUser)) {
      // PARTNER: 
      // - In transaction page (searchAll=true): Can search ALL customers by name/phone
      // - In customer page: Can only see customers they added
      if (!authUser.partnerId) {
        return NextResponse.json(
          { success: false, error: 'Partner profile not found' },
          { status: 403 }
        )
      }
      // If searchAll is true, allow searching all customers (for transaction form)
      // Otherwise, only show partner's own customers (for customer list page)
      if (!searchAll) {
        where.partnerId = authUser.partnerId
      }
    } else if (isOwner(authUser)) {
      // OWNER: Can see ALL customers
      // Owner can optionally filter by partnerId if provided in query params
      if (queryPartnerId) {
        where.partnerId = queryPartnerId
      }
    } else {
      // Not authenticated - return error
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Add label filter
    if (label && label !== 'ALL') {
      where.label = label
    }
    
    if (city && city !== 'ALL') {
      where.city = city
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { whatsapp: { contains: search } },
        { city: { contains: search } },
        { bank: { contains: search } },
      ]
    }

    // Get total count
    const total = await db.customer.count({ where })

    // Get customers with pagination
    const customers = await db.customer.findMany({
      where,
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
        _count: {
          select: { transactions: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    })

    // Get city distribution for heatmap
    const cityDistribution = await db.customer.groupBy({
      by: ['city'],
      where: {
        city: { not: null },
        label: { not: 'BLACKLIST' }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    })

    // Format response
    const formattedCustomers = customers.map((customer) => ({
      ...customer,
      transactionCount: customer._count.transactions,
      _count: undefined,
    }))

    return NextResponse.json({
      success: true,
      data: formattedCustomers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      cityDistribution: cityDistribution.map(c => ({
        city: c.city,
        count: c._count.id
      })).filter(c => c.city !== null),
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

// POST /api/customers - Create new customer
// Owner can assign customer to any partner or leave unassigned
// Partner can only create customers for themselves
export async function POST(request: NextRequest) {
  try {
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

    // Validate required fields
    if (!name || !whatsapp) {
      return NextResponse.json(
        { success: false, error: 'Nama dan No WhatsApp wajib diisi' },
        { status: 400 }
      )
    }

    // Format and validate WhatsApp
    const formattedWa = formatWhatsApp(whatsapp)
    if (!validateWhatsApp(formattedWa)) {
      return NextResponse.json(
        { success: false, error: 'Format No WhatsApp tidak valid (contoh: 08xxxxxxxxxx)' },
        { status: 400 }
      )
    }

    // Check for duplicate WhatsApp
    const existingCustomer = await db.customer.findFirst({
      where: { whatsapp: formattedWa }
    })

    if (existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'No WhatsApp sudah terdaftar' },
        { status: 400 }
      )
    }

    // Validate bank info if provided
    if (bank && (!accountNumber || !accountHolder)) {
      return NextResponse.json(
        { success: false, error: 'Jika mengisi Bank, No Rekening dan Nama Pemilik wajib diisi' },
        { status: 400 }
      )
    }

    // Determine partnerId based on role
    let finalPartnerId: string | null = null
    
    if (isPartner(authUser)) {
      // Partner can only create customers for themselves
      if (!authUser.partnerId) {
        return NextResponse.json(
          { success: false, error: 'Partner profile not found' },
          { status: 403 }
        )
      }
      finalPartnerId = authUser.partnerId
    } else if (isOwner(authUser)) {
      // Owner can assign customer to any partner or leave unassigned
      finalPartnerId = partnerId || null
    }

    // Create customer
    const customer = await db.customer.create({
      data: {
        name,
        whatsapp: formattedWa,
        bank: bank || null,
        accountNumber: accountNumber || null,
        accountHolder: accountHolder || null,
        city: city || null,
        label: label || 'NEW',
        partnerId: finalPartnerId,
      },
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
      message: 'Customer berhasil ditambahkan'
    })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}
