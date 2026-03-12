import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('requisition_documents')
export class RequisitionDocumentEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  requisitionId!: string; // Link to requisition

  @Column('uuid')
  uploadedBy!: string; // User ID who uploaded the document

  @Column({ nullable: true })
  uploadedByName?: string; // Name of user who uploaded the document

  @Column({ nullable: true })
  uploadedBySurname?: string; // Surname of user who uploaded the document

  @Column({ nullable: true })
  uploadedByEmail?: string; // Email of user who uploaded the document

  @Column('text')
  fileName!: string; // Original filename

  @Column({ type: 'blob' })
  fileData!: Buffer; // File data stored as blob

  @Column('int')
  fileSize!: number; // File size in bytes

  @Column('text')
  mimeType!: string; // File MIME type (e.g., 'application/pdf', 'image/png')

  @Column('text', { nullable: true })
  description?: string; // Optional description/notes

  @CreateDateColumn()
  uploadedAt!: Date; // When the file was uploaded
}
