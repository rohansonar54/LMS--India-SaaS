import React from 'react';
import OrderTrackingClient from './OrderTrackingClient';

export default async function Page({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return <OrderTrackingClient orderNumber={orderNumber} />;
}
