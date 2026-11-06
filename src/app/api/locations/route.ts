import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Location } from '@/models/Location';
import { User } from '@/models/User';
import { requireAuth } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.user) return auth.response;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const search = searchParams.get('search') || '';

    const query: Record<string, unknown> = {};
    if (!includeInactive) {
      query.active = true;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { code: regex },
        { city: regex },
        { state: regex },
        { phone: regex },
      ];
    }

    const locations = await Location.find(query).sort({ active: -1, name: 1 });

    // Fetch assigned staff members per location
    const staffMembers = await User.find({ level: { $gt: 0 } }).select('name username locationId');

    const locationsWithStaff = locations.map((loc) => {
      const locStaff = staffMembers.filter(
        (s) => s.locationId?.toString() === loc._id.toString()
      );
      return {
        ...loc.toObject(),
        staffCount: locStaff.length,
        staffNames: locStaff.map((s) => s.name || s.username),
      };
    });

    return NextResponse.json({ success: true, locations: locationsWithStaff });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(0);
    if (!auth.user) return auth.response;

    await connectDB();

    const body = await req.json();
    const { name, code, address, city, state, country, pincode, phone, email, active } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, message: 'Location Name and Unique Code are required.' },
        { status: 400 }
      );
    }

    const formattedCode = code.toUpperCase().trim();
    const existing = await Location.findOne({ code: formattedCode });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Location code "${formattedCode}" already exists. Please choose another code.` },
        { status: 400 }
      );
    }

    const newLocation = await Location.create({
      name: name.trim(),
      code: formattedCode,
      address: address?.trim() || '',
      city: city?.trim() || 'Nashik',
      state: state?.trim() || 'Maharashtra',
      country: country?.trim() || 'India',
      pincode: pincode?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      active: active !== undefined ? Boolean(active) : true,
    });

    return NextResponse.json({ success: true, location: newLocation });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(0);
    if (!auth.user) return auth.response;

    await connectDB();

    const body = await req.json();
    const { id, name, code, address, city, state, country, pincode, phone, email, active, assignedStaffIds } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Location ID is required.' }, { status: 400 });
    }

    const location = await Location.findById(id);
    if (!location) {
      return NextResponse.json({ success: false, message: 'Location not found.' }, { status: 404 });
    }

    // Check code collision if code changed
    if (code) {
      const formattedCode = code.toUpperCase().trim();
      const existing = await Location.findOne({ code: formattedCode, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json(
          { success: false, message: `Location code "${formattedCode}" is already in use by another branch.` },
          { status: 400 }
        );
      }
      location.code = formattedCode;
    }

    if (name) location.name = name.trim();
    if (address !== undefined) location.address = address.trim();
    if (city !== undefined) location.city = city.trim();
    if (state !== undefined) location.state = state.trim();
    if (country !== undefined) location.country = country.trim();
    if (pincode !== undefined) location.pincode = pincode.trim();
    if (phone !== undefined) location.phone = phone.trim();
    if (email !== undefined) location.email = email.trim();
    if (active !== undefined) location.active = Boolean(active);

    await location.save();

    // Assign / reassign staff members if provided
    if (Array.isArray(assignedStaffIds)) {
      // Clear location for staff who were unassigned
      await User.updateMany(
        { locationId: location._id, _id: { $nin: assignedStaffIds } },
        { $set: { locationId: null, locationName: '' } }
      );

      // Assign selected staff
      if (assignedStaffIds.length > 0) {
        await User.updateMany(
          { _id: { $in: assignedStaffIds } },
          { $set: { locationId: location._id, locationName: location.name } }
        );
      }
    }

    return NextResponse.json({ success: true, location });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
