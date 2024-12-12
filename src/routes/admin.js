const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { adminAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * @swagger
 * /api/admin/competitions:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Create a new competition
 *     description: Create a competition with all required details including level, date, venue, fees, and rules.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - level
 *               - date
 *               - venue
 *               - registration_deadline
 *               - maximum_teams
 *               - fees
 *               - rules
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the competition.
 *                 example: Tech Fest 2024
 *               level:
 *                 type: string
 *                 enum: [Regional, National, International]
 *                 description: The level of the competition.
 *                 example: Regional
 *               date:
 *                 type: string
 *                 format: date
 *                 description: The date of the competition.
 *                 example: 2024-12-15
 *               venue:
 *                 type: string
 *                 description: The venue of the competition.
 *                 example: Tech Convention Center
 *               registration_deadline:
 *                 type: string
 *                 format: date
 *                 description: The deadline for registration.
 *                 example: 2024-12-01
 *               maximum_teams:
 *                 type: integer
 *                 description: Maximum number of teams allowed.
 *                 example: 10
 *               fees:
 *                 type: number
 *                 format: float
 *                 description: Registration fee for the competition.
 *                 example: 50.00
 *               rules:
 *                 type: string
 *                 description: Rules for the competition.
 *                 example: Rule 1: Each team must have 4 members.
 *     responses:
 *       201:
 *         description: Competition created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Competition created successfully
 *       400:
 *         description: Validation errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         example: Name is required
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Server error
 *                 error:
 *                   type: string
 *                   example: Internal server error occurred
 */


router.post(
  '/competitions',
  adminAuth,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('level')
      .isIn(['Regional', 'National', 'International'])
      .withMessage('Level must be Regional, National, or International'),
    body('date').isISO8601().toDate().withMessage('Invalid date format'),
    body('venue').notEmpty().withMessage('Venue is required'),
    body('registration_deadline')
      .isISO8601()
      .toDate()
      .withMessage('Invalid registration deadline format'),
    body('maximum_teams')
      .isInt({ min: 0 })
      .withMessage('Maximum teams must be a non-negative integer'),
    body('fees')
      .isFloat({ min: 0 })
      .withMessage('Fees must be a non-negative number'),
    body('rules').notEmpty().withMessage('Rules are required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        name,
        level,
        date,
        venue,
        registration_deadline,
        maximum_teams,
        fees,
        rules,
      } = req.body;

      await db.query(
        `
        INSERT INTO Competitions 
          (name, level, date, venue, registration_deadline, maximum_teams, fees, rules)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          name,
          level,
          date,
          venue,
          registration_deadline,
          maximum_teams,
          fees,
          rules,
        ]
      );

      res.status(201).json({ message: 'Competition created successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);
/**
 * @swagger
 * /api/admin/regions:
 *   post:
 *     tags: [Admin]
 *     summary: Add a regional event
 *     security:
 *       - bearerAuth: []
 */
router.post('/regions', adminAuth, [
  body('region_name').notEmpty(),
  body('event_date').isDate(),
  body('venue').notEmpty(),
  body('competition_id').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { region_name, event_date, venue, competition_id } = req.body;
    
    await db.query(
      'INSERT INTO Regions (region_name, event_date, venue, competition_id) VALUES (?, ?, ?, ?)',
      [region_name, event_date, venue, competition_id]
    );

    res.status(201).json({ message: 'Regional event added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/registrations:
 *   get:
 *     tags: [Admin]
 *     summary: Get all registrations
 *     security:
 *       - bearerAuth: []
 */
router.get('/registrations', adminAuth, async (req, res) => {
  try {
    const [registrations] = await db.query(`
      SELECT r.*, u.name as user_name, c.name as competition_name, reg.region_name
      FROM Registrations r
      JOIN Users u ON r.user_id = u.id
      JOIN Competitions c ON r.competition_id = c.id
      JOIN Regions reg ON r.region_id = reg.id
    `);

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/certificates:
 *   post:
 *     tags: [Admin]
 *     summary: Generate certificate
 *     security:
 *       - bearerAuth: []
 */
router.post('/certificates', adminAuth, [
  body('registration_id').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { registration_id } = req.body;
    const certificateUrl = `${process.env.BASE_URL}/certificates/${uuidv4()}.pdf`;
    
    await db.query(
      'INSERT INTO Certificates (registration_id, certificate_url) VALUES (?, ?)',
      [registration_id, certificateUrl]
    );

    res.json({ certificate_url: certificateUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/event-pass:
 *   post:
 *     tags: [Admin]
 *     summary: Generate event pass
 *     security:
 *       - bearerAuth: []
 */
router.post('/event-pass', adminAuth, [
  body('registration_id').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { registration_id } = req.body;
    const qrCode = uuidv4();
    const passUrl = `${process.env.BASE_URL}/passes/${qrCode}.pdf`;
    
    await db.query(
      'INSERT INTO EventPass (registration_id, pass_url, qr_code) VALUES (?, ?, ?)',
      [registration_id, passUrl, qrCode]
    );

    res.json({ pass_url: passUrl, qr_code: qrCode });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;