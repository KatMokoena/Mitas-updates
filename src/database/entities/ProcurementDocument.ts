import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('procurement_documents')
export class ProcurementDocumentEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  orderId!: string; // Order/Project this procurement document is for

  @Column('uuid')
  createdBy!: string; // User ID who generated the document

  @Column({ nullable: true })
  createdByName?: string; // Name of user who generated the document

  @Column({ nullable: true })
  createdBySurname?: string; // Surname of user who generated the document

  @Column({ nullable: true })
  createdByEmail?: string; // Email of user who generated the document

  @Column('text')
  itemName!: string; // Item name

  @Column('text')
  itemCode!: string; // Item code

  @Column('text')
  itemDescription!: string; // Item description

  @Column('int')
  quantity!: number; // Quantity requested

  @Column('text')
  customerNumber!: string; // Customer number

  @Column('text', { nullable: true })
  additionalCriteria?: string; // Additional criteria

  @Column('text')
  fileName!: string; // Generated filename

  @Column({ type: 'blob' })
  pdfData!: Buffer; // PDF file data stored as blob

  @Column('int')
  fileSize!: number; // File size in bytes

  @Column('simple-array', { nullable: true })
  taggedUsers?: string[]; // User IDs who were tagged

  @Column('text', { nullable: true })
  taggedUserNames?: string; // JSON string of tagged user names, surnames, emails

  @Column('text', { nullable: true })
  uploadedFileName?: string; // Original filename of uploaded document

  @Column({ type: 'blob', nullable: true })
  uploadedFileData?: Buffer; // Uploaded file data stored as blob

  @Column('int', { nullable: true })
  uploadedFileSize?: number; // Uploaded file size in bytes

  @Column('text', { nullable: true })
  uploadedFileMimeType?: string; // MIME type of uploaded file

  @CreateDateColumn()
  createdAt!: Date; // When the document was generated
}

