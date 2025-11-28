import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('requisition_proofs')
export class RequisitionProofEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  requisitionId!: string; // Link to requisition

  @Column('uuid')
  uploadedBy!: string; // User ID who uploaded the proof

  @Column('text')
  fileName!: string; // Original filename

  @Column('text')
  filePath!: string; // Path to stored file

  @Column('text')
  mimeType!: string; // File MIME type (e.g., 'application/pdf', 'image/png')

  @Column('int')
  fileSize!: number; // File size in bytes

  @Column('text', { nullable: true })
  description?: string; // Optional description/notes

  @CreateDateColumn()
  uploadedAt!: Date; // When the file was uploaded
}

