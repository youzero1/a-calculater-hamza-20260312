import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('calculation_history')
export class CalculationHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  expression!: string;

  @Column({ type: 'text' })
  result!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
