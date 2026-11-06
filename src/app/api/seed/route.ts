import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { Customer } from '@/models/Customer';
import { Location } from '@/models/Location';
import { ClothingItem } from '@/models/ClothingItem';
import { Order } from '@/models/Order';
import { Payment } from '@/models/Payment';
import { Supply } from '@/models/Supply';
import { Price } from '@/models/Price';
import { Log } from '@/models/Log';
import { getWorkflowStagesForServices } from '@/lib/workflow';
import { requireAuth } from '@/lib/auth-helpers';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    const auth = await requireAuth(0);
    if (!auth.user) return auth.response;

    await connectDB();

    // 1. Seed / Ensure Locations
    let loc1 = await Location.findOne({ code: 'MUM-01' });
    if (!loc1) {
      loc1 = await Location.create({
        name: 'Mumbai Central Branch',
        code: 'MUM-01',
        address: 'Shop 4, Dr. D.B. Marg, Mumbai Central, Mumbai, MH',
        phone: '+91 98200 11223',
        active: true,
      });
    }

    let loc2 = await Location.findOne({ code: 'MUM-02' });
    if (!loc2) {
      loc2 = await Location.create({
        name: 'Andheri West Hub',
        code: 'MUM-02',
        address: '12 Link Road, Near Metro Station, Andheri West, Mumbai, MH',
        phone: '+91 98200 44556',
        active: true,
      });
    }

    let loc3 = await Location.findOne({ code: 'BLR-01' });
    if (!loc3) {
      loc3 = await Location.create({
        name: 'Bangalore Indiranagar',
        code: 'BLR-01',
        address: '100ft Road, HAL 2nd Stage, Indiranagar, Bengaluru, KA',
        phone: '+91 98450 77889',
        active: true,
      });
    }

    // 2. Migration: Ensure all existing historical customers and orders have locationId
    await Customer.updateMany(
      { $or: [{ locationId: null }, { locationId: { $exists: false } }] },
      { $set: { locationId: loc1._id, locationName: loc1.name } }
    );

    const historicalOrders = await Order.find({
      $or: [{ locationId: null }, { locationId: { $exists: false } }],
    });

    for (const ord of historicalOrders) {
      const bal = Math.max(0, ord.total - (ord.amountPaid || 0));
      ord.locationId = loc1._id;
      ord.locationName = loc1.name;
      ord.balance = bal;
      ord.paymentStatus = bal === 0 ? 'paid' : ord.amountPaid > 0 ? 'partial' : 'unpaid';
      if (!ord.pricingType) ord.pricingType = 'weight';
      if (!ord.activeWorkflowSteps || ord.activeWorkflowSteps.length === 0) {
        ord.activeWorkflowSteps = ['pending', 'processing', 'washing', 'drying', 'folding', 'done', 'claimed'];
      }
      await ord.save();

      // Ensure historical payments exist so revenue is counted
      if (ord.amountPaid > 0) {
        const payExists = await Payment.findOne({ orderId: ord._id });
        if (!payExists) {
          await Payment.create({
            orderId: ord._id,
            orderNumber: ord.orderNumber,
            customerId: ord.customerId,
            customerName: ord.customerName,
            locationId: loc1._id,
            locationName: loc1.name,
            amount: ord.amountPaid,
            method: 'Cash',
            staffName: ord.staffName || 'Staff',
            isAdvance: true,
            createdAt: ord.createdAt,
          });
        }
      }
    }

    // 3. Seed Users (Admin & Branch Staff)
    const adminHash = await bcrypt.hash('admin', 10);
    const staffHash = await bcrypt.hash('staff123', 10);

    // Admin (no location restriction, can access all)
    await User.findOneAndUpdate(
      { username: 'admin' },
      {
        username: 'admin',
        password: adminHash,
        name: 'Super Administrator',
        level: 0,
        locationId: null,
        locationName: 'All Locations',
      },
      { upsert: true }
    );

    // Staff for Mumbai Central
    await User.findOneAndUpdate(
      { username: 'staff_mumbai' },
      {
        username: 'staff_mumbai',
        password: staffHash,
        name: 'Amit Verma (Mumbai Central)',
        level: 1,
        locationId: loc1._id,
        locationName: loc1.name,
      },
      { upsert: true }
    );

    // Default legacy staff account bound to Mumbai Central
    await User.findOneAndUpdate(
      { username: 'staff' },
      {
        username: 'staff',
        password: staffHash,
        name: 'Front Desk Attendant',
        level: 1,
        locationId: loc1._id,
        locationName: loc1.name,
      },
      { upsert: true }
    );

    // Staff for Andheri West
    await User.findOneAndUpdate(
      { username: 'staff_andheri' },
      {
        username: 'staff_andheri',
        password: staffHash,
        name: 'Sunita Rao (Andheri)',
        level: 1,
        locationId: loc2._id,
        locationName: loc2.name,
      },
      { upsert: true }
    );

    // Staff for Bangalore
    await User.findOneAndUpdate(
      { username: 'staff_blr' },
      {
        username: 'staff_blr',
        password: staffHash,
        name: 'Karthik Gowda (Bangalore)',
        level: 1,
        locationId: loc3._id,
        locationName: loc3.name,
      },
      { upsert: true }
    );

    // 4. Seed Clothing Items Master with Indian Rupee rates
    const itemCount = await ClothingItem.countDocuments();
    if (itemCount === 0) {
      await ClothingItem.insertMany([
        {
          name: 'Shirt / Formal Shirt',
          category: 'Men',
          icon: '👔',
          defaultService: 'Wash & Iron',
          services: [
            { serviceName: 'Wash & Iron', price: 25 },
            { serviceName: 'Iron Only', price: 12 },
            { serviceName: 'Dry Clean', price: 60 },
            { serviceName: 'Wash & Fold', price: 20 },
          ],
        },
        {
          name: 'T-Shirt / Polo',
          category: 'Men',
          icon: '👕',
          defaultService: 'Wash & Iron',
          services: [
            { serviceName: 'Wash & Iron', price: 20 },
            { serviceName: 'Iron Only', price: 10 },
            { serviceName: 'Wash & Fold', price: 15 },
          ],
        },
        {
          name: 'Trousers / Chinos',
          category: 'Men',
          icon: '👖',
          defaultService: 'Wash & Iron',
          services: [
            { serviceName: 'Wash & Iron', price: 30 },
            { serviceName: 'Iron Only', price: 15 },
            { serviceName: 'Dry Clean', price: 70 },
          ],
        },
        {
          name: 'Jeans / Denim',
          category: 'Men',
          icon: '👖',
          defaultService: 'Wash & Iron',
          services: [
            { serviceName: 'Wash & Iron', price: 35 },
            { serviceName: 'Iron Only', price: 15 },
            { serviceName: 'Dry Clean', price: 80 },
          ],
        },
        {
          name: 'Saree (Daily / Cotton)',
          category: 'Women',
          icon: '🥻',
          defaultService: 'Roll Press',
          services: [
            { serviceName: 'Roll Press', price: 60 },
            { serviceName: 'Dry Clean', price: 120 },
            { serviceName: 'Steam Press', price: 40 },
          ],
        },
        {
          name: 'Saree (Silk / Heavy Embroidered)',
          category: 'Women',
          icon: '🥻',
          defaultService: 'Dry Clean',
          services: [
            { serviceName: 'Dry Clean', price: 200 },
            { serviceName: 'Roll Press', price: 90 },
            { serviceName: 'Steam Press', price: 60 },
          ],
        },
        {
          name: 'Kurta / Kurti',
          category: 'General',
          icon: '👘',
          defaultService: 'Wash & Iron',
          services: [
            { serviceName: 'Wash & Iron', price: 35 },
            { serviceName: 'Iron Only', price: 15 },
            { serviceName: 'Dry Clean', price: 80 },
          ],
        },
        {
          name: 'Suit (2-Piece Blazer + Pant)',
          category: 'Men',
          icon: '🤵',
          defaultService: 'Dry Clean',
          services: [
            { serviceName: 'Dry Clean', price: 250 },
            { serviceName: 'Steam Press', price: 90 },
          ],
        },
        {
          name: 'Bedsheet (Double)',
          category: 'Household',
          icon: '🛏️',
          defaultService: 'Wash & Iron',
          services: [
            { serviceName: 'Wash & Iron', price: 70 },
            { serviceName: 'Wash & Fold', price: 50 },
          ],
        },
        {
          name: 'Blanket / Heavy Quilt',
          category: 'Household',
          icon: '🛋️',
          defaultService: 'Dry Clean',
          services: [
            { serviceName: 'Dry Clean', price: 250 },
            { serviceName: 'Wash & Dry', price: 180 },
          ],
        },
        {
          name: 'Curtain (Per Panel)',
          category: 'Household',
          icon: '🪟',
          defaultService: 'Dry Clean',
          services: [
            { serviceName: 'Dry Clean', price: 120 },
            { serviceName: 'Wash & Iron', price: 80 },
          ],
        },
      ]);
    }

    // 5. Seed Legacy Prices (Rates per kg/pcs)
    const priceCount = await Price.countDocuments();
    if (priceCount === 0) {
      await Price.insertMany([
        { name: 'Wash & Fold (Per Kg)', unit: 'kg', price: 45 },
        { name: 'Wash & Steam Iron (Per Kg)', unit: 'kg', price: 65 },
        { name: 'Premium Dry Clean (Per Piece)', unit: 'pcs', price: 150 },
        { name: 'Heavy Blanket / Quilt', unit: 'pcs', price: 200 },
      ]);
    }

    // 6. Seed Customers for Locations
    let c1 = await Customer.findOne({ contact: '9821055678' });
    if (!c1) {
      c1 = await Customer.create({
        fullname: 'Rajesh Sharma',
        address: 'B-402, Sea Green Apts, Mumbai Central',
        contact: '9821055678',
        locationId: loc1._id,
        locationName: loc1.name,
        outstandingBalance: 120,
      });
    }

    let c2 = await Customer.findOne({ contact: '9833099887' });
    if (!c2) {
      c2 = await Customer.create({
        fullname: 'Priya Patel',
        address: '15 Versova Beach Road, Andheri West',
        contact: '9833099887',
        locationId: loc2._id,
        locationName: loc2.name,
        outstandingBalance: 200,
      });
    }

    let c3 = await Customer.findOne({ contact: '9844022334' });
    if (!c3) {
      c3 = await Customer.create({
        fullname: 'Ananya Iyer',
        address: '77 Defence Colony, Indiranagar, Bengaluru',
        contact: '9844022334',
        locationId: loc3._id,
        locationName: loc3.name,
        outstandingBalance: 350,
      });
    }

    // 7. Seed Supplies
    const supplyCount = await Supply.countDocuments();
    if (supplyCount === 0) {
      await Supply.insertMany([
        { name: 'Surf Excel Matic Liquid', unit: 'scoop', stock: 150, cost: 12, locationId: loc1._id, locationName: loc1.name },
        { name: 'Comfort Fabric Conditioner', unit: 'cap', stock: 95, cost: 8, locationId: loc1._id, locationName: loc1.name },
        { name: 'Poly Packaging Bags (Large)', unit: 'pcs', stock: 320, cost: 4, locationId: loc1._id, locationName: loc1.name },
        { name: 'Wire Clothes Hangers', unit: 'pcs', stock: 18, cost: 6, locationId: loc1._id, locationName: loc1.name }, // Low stock!
        { name: 'Surf Excel Matic Liquid', unit: 'scoop', stock: 110, cost: 12, locationId: loc2._id, locationName: loc2.name },
        { name: 'Wire Clothes Hangers', unit: 'pcs', stock: 140, cost: 6, locationId: loc2._id, locationName: loc2.name },
      ]);
    }

    // 8. Seed New Sample INR Item-based Orders (LMS-IN-1001, LMS-IN-1002, LMS-IN-1003)
    const existingInSample = await Order.findOne({ orderNumber: 'LMS-IN-1001' });
    if (!existingInSample && c1 && loc1) {
      // Order 1: Washing + Ironing, Full Payment
      const o1Workflow = getWorkflowStagesForServices(['Wash & Iron']);
      const o1 = await Order.create({
        orderNumber: 'LMS-IN-1001',
        locationId: loc1._id,
        locationName: loc1.name,
        customerId: c1._id,
        customerName: c1.fullname,
        customerContact: c1.contact,
        customerAddress: c1.address,
        staffName: 'Amit Verma',
        pricingType: 'item',
        orderItems: [
          { itemName: 'Shirt / Formal Shirt', serviceName: 'Wash & Iron', qty: 3, unitPrice: 25, subtotal: 75 },
          { itemName: 'Jeans / Denim', serviceName: 'Wash & Iron', qty: 2, unitPrice: 35, subtotal: 70 },
          { itemName: 'T-Shirt / Polo', serviceName: 'Wash & Iron', qty: 2, unitPrice: 20, subtotal: 40 },
        ],
        items: [],
        supplies: [],
        subtotal: 185,
        additionalCharges: 15,
        discount: 0,
        total: 200,
        amountPaid: 200,
        balance: 0,
        change: 0,
        paymentStatus: 'paid',
        paymentMethod: 'UPI',
        status: 'washing',
        activeWorkflowSteps: o1Workflow,
        expectedDeliveryDate: new Date(Date.now() + 86400000 * 2),
        timeline: {
          pendingAt: new Date(Date.now() - 7200000),
          washingAt: new Date(Date.now() - 3600000),
        },
      });

      await Payment.create({
        orderId: o1._id,
        orderNumber: o1.orderNumber,
        customerId: c1._id,
        customerName: c1.fullname,
        locationId: loc1._id,
        locationName: loc1.name,
        amount: 200,
        method: 'UPI',
        referenceNumber: 'UPI/2026/0491028',
        staffName: 'Amit Verma',
        isAdvance: true,
      });

      // Order 2: Ironing-Only (Skips washing & drying stages!)
      const o2Workflow = getWorkflowStagesForServices(['Iron Only']);
      await Order.create({
        orderNumber: 'LMS-IN-1002',
        locationId: loc1._id,
        locationName: loc1.name,
        customerId: c1._id,
        customerName: c1.fullname,
        customerContact: c1.contact,
        customerAddress: c1.address,
        staffName: 'Amit Verma',
        pricingType: 'item',
        orderItems: [
          { itemName: 'Shirt / Formal Shirt', serviceName: 'Iron Only', qty: 5, unitPrice: 12, subtotal: 60 },
          { itemName: 'Trousers / Chinos', serviceName: 'Iron Only', qty: 4, unitPrice: 15, subtotal: 60 },
        ],
        items: [],
        supplies: [],
        subtotal: 120,
        additionalCharges: 0,
        discount: 0,
        total: 120,
        amountPaid: 0,
        balance: 120,
        change: 0,
        paymentStatus: 'unpaid',
        paymentMethod: 'Cash',
        status: 'ironing',
        activeWorkflowSteps: o2Workflow, // ['pending', 'ironing', 'done', 'claimed']
        expectedDeliveryDate: new Date(Date.now() + 86400000),
        timeline: {
          pendingAt: new Date(Date.now() - 5400000),
          ironingAt: new Date(Date.now() - 1800000),
        },
      });

      // Order 3: Dry Cleaning, Ready for pickup with Pending Balance (Andheri West)
      if (c2 && loc2) {
        const o3Workflow = getWorkflowStagesForServices(['Dry Clean']);
        const o3 = await Order.create({
          orderNumber: 'LMS-IN-1003',
          locationId: loc2._id,
          locationName: loc2.name,
          customerId: c2._id,
          customerName: c2.fullname,
          customerContact: c2.contact,
          customerAddress: c2.address,
          staffName: 'Sunita Rao',
          pricingType: 'item',
          orderItems: [
            { itemName: 'Saree (Silk / Heavy Embroidered)', serviceName: 'Dry Clean', qty: 1, unitPrice: 200, subtotal: 200 },
            { itemName: 'Suit (2-Piece Blazer + Pant)', serviceName: 'Dry Clean', qty: 1, unitPrice: 250, subtotal: 250 },
          ],
          items: [],
          supplies: [],
          subtotal: 450,
          additionalCharges: 0,
          discount: 50,
          total: 400,
          amountPaid: 200,
          balance: 200,
          change: 0,
          paymentStatus: 'partial',
          paymentMethod: 'Card',
          status: 'done', // Ready for pickup
          activeWorkflowSteps: o3Workflow,
          expectedDeliveryDate: new Date(),
          timeline: {
            pendingAt: new Date(Date.now() - 86400000),
            doneAt: new Date(Date.now() - 7200000),
          },
        });

        await Payment.create({
          orderId: o3._id,
          orderNumber: o3.orderNumber,
          customerId: c2._id,
          customerName: c2.fullname,
          locationId: loc2._id,
          locationName: loc2.name,
          amount: 200,
          method: 'Card',
          referenceNumber: 'CARD/2026/8892',
          staffName: 'Sunita Rao',
          isAdvance: true,
        });
      }
    }

    await Log.create({
      username: 'admin',
      type: 'Database',
      logs: 'Seeded & migrated Indian multi-location LMS data with INR currency & dynamic item pricing',
    });

    return NextResponse.json({
      success: true,
      message: 'Database successfully migrated & initialized with Indian multi-location data!',
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
