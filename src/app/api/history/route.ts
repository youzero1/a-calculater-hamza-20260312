import { NextResponse } from 'next/server';
import { getDataSource } from '@/lib/database';
import { CalculationHistory } from '@/lib/entities/CalculationHistory';

export async function GET() {
  try {
    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(CalculationHistory);
    const history = await repo.find({
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { expression, result } = body as { expression: string; result: string };

    if (!expression || result === undefined) {
      return NextResponse.json({ error: 'Missing expression or result' }, { status: 400 });
    }

    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(CalculationHistory);

    const entry = repo.create({ expression, result });
    await repo.save(entry);

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('Error saving history:', error);
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(CalculationHistory);
    await repo.clear();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing history:', error);
    return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 });
  }
}
