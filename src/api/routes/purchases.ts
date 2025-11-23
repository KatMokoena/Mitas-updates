import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { PurchaseEntity } from '../../database/entities/Purchase';

const router = Router();
router.use(authMiddleware);

// Get all purchases (optionally filtered by orderId)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const purchaseRepository = getDataSource().getRepository(PurchaseEntity);
    const orderId = req.query.orderId as string | undefined;
    
    const where = orderId ? { orderId } : {};
    const purchases = await purchaseRepository.find({
      where,
      order: { orderDate: 'DESC' },
    });
    
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// Get purchase by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const purchaseRepository = getDataSource().getRepository(PurchaseEntity);
    const purchase = await purchaseRepository.findOne({
      where: { id: req.params.id },
    });
    
    if (!purchase) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }
    
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase' });
  }
});

// Create purchase
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const purchaseRepository = getDataSource().getRepository(PurchaseEntity);
    const purchase = purchaseRepository.create(req.body);
    const savedPurchase = await purchaseRepository.save(purchase);
    
    res.status(201).json(savedPurchase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create purchase' });
  }
});

// Update purchase
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const purchaseRepository = getDataSource().getRepository(PurchaseEntity);
    const purchase = await purchaseRepository.findOne({
      where: { id: req.params.id },
    });
    
    if (!purchase) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }
    
    Object.assign(purchase, req.body);
    const updatedPurchase = await purchaseRepository.save(purchase);
    
    res.json(updatedPurchase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update purchase' });
  }
});

// Delete purchase
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const purchaseRepository = getDataSource().getRepository(PurchaseEntity);
    await purchaseRepository.delete(req.params.id);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete purchase' });
  }
});

export default router;
