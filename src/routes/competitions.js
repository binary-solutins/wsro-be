const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { auth } = require('../middleware/auth');
const { sendRegistrationEmail } = require('../../utils/emailService');
const { generateTeamCode } = require('../../utils/teamCodeGenerator');
const { sendCertificateEmail, generateCertificate } = require('../../utils/certificateService');
const fs = require('fs').promises; // Ensure fs is imported for file operations


/**
 * @swagger
 * /api/competitions:
 *   get:
 *     tags: [Competitions]
 *     summary: Get all competitions
 *     responses:
 *       200:
 *         description: A list of competitions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   start_date:
 *                     type: string
 *                     format: date-time
 *                   end_date:
 *                     type: string
 *                     format: date-time
 *                   regions_count:
 *                     type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.get('/', async (req, res) => {
  try {
    const [competitions] = await db.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM Regions r WHERE r.competition_id = c.id) as regions_count
      FROM Competitions c
    `);
    
    res.json(competitions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/competitions/new:
 *   post:
 *     tags: [Competitions]
 *     summary: Create a new competition
 *     description: Create a competition with required details
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
 *                 description: Name of the competition
 *               level:
 *                 type: string
 *                 enum: [Regional, National, International]
 *                 description: Level of the competition
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Competition date
 *               venue:
 *                 type: string
 *                 description: Competition venue
 *               registration_deadline:
 *                 type: string
 *                 format: date
 *                 description: Registration deadline
 *               maximum_teams:
 *                 type: integer
 *                 description: Maximum number of teams
 *               fees:
 *                 type: number
 *                 description: Registration fees
 *               rules:
 *                 type: string
 *                 description: Competition rules
 *     responses:
 *       201:
 *         description: Competition created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
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
 */
router.post('/new', [
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
], async (req, res) => {
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
      `INSERT INTO Competitions 
        (name, level, date, venue, registration_deadline, maximum_teams, fees, rules)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, level, date, venue, registration_deadline, maximum_teams, fees, rules]
    );

    res.status(201).json({ message: 'Competition created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
/**
 * @swagger
 * /api/competitions/{id}:
 *   put:
 *     tags: [Competitions]
 *     summary: Update a competition
 *     description: Update an existing competition's details. Only administrators can update competitions.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the competition to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the competition
 *               level:
 *                 type: string
 *                 enum: [Regional, National, International]
 *                 description: Level of the competition
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Competition date
 *               venue:
 *                 type: string
 *                 description: Competition venue
 *               registration_deadline:
 *                 type: string
 *                 format: date
 *                 description: Registration deadline
 *               maximum_teams:
 *                 type: integer
 *                 description: Maximum number of teams
 *               fees:
 *                 type: number
 *                 description: Registration fees
 *               rules:
 *                 type: string
 *                 description: Competition rules
 *     responses:
 *       200:
 *         description: Competition updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
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
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Competition not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.put('/:id', [
  auth,
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('level')
    .optional()
    .isIn(['Regional', 'National', 'International'])
    .withMessage('Level must be Regional, National, or International'),
  body('date')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid date format'),
  body('venue')
    .optional()
    .notEmpty()
    .withMessage('Venue cannot be empty'),
  body('registration_deadline')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid registration deadline format'),
  body('maximum_teams')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum teams must be a non-negative integer'),
  body('fees')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fees must be a non-negative number'),
  body('rules')
    .optional()
    .notEmpty()
    .withMessage('Rules cannot be empty'),
], async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }

    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if competition exists
    const [competition] = await db.query(
      'SELECT * FROM Competitions WHERE id = ?',
      [req.params.id]
    );

    if (competition.length === 0) {
      return res.status(404).json({ message: 'Competition not found' });
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    const allowedFields = [
      'name',
      'level',
      'date',
      'venue',
      'registration_deadline',
      'maximum_teams',
      'fees',
      'rules'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    // Add id to values array for WHERE clause
    values.push(req.params.id);

    // Execute update query
    await db.query(
      `UPDATE Competitions SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Competition updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/registrations/{user_id}:
 *   get:
 *     tags: [Competitions]
 *     summary: Get user registrations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         description: ID of the user
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A list of user registrations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   competition_name:
 *                     type: string
 *                   region_name:
 *                     type: string
 *                   certificate_url:
 *                     type: string
 *                   pass_url:
 *                     type: string
 *                   qr_code:
 *                     type: string
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.get('/registrations/:user_id', auth, async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.user_id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [registrations] = await db.query(`
      SELECT r.*, c.name as competition_name, reg.region_name,
        cert.certificate_url, ep.pass_url, ep.qr_code
      FROM Registrations r
      JOIN Competitions c ON r.competition_id = c.id
      JOIN Regions reg ON r.region_id = reg.id
      LEFT JOIN Certificates cert ON r.id = cert.registration_id
      LEFT JOIN EventPass ep ON r.id = ep.registration_id
      WHERE r.user_id = ?
    `, [req.params.user_id]);

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/competitions/{id}:
 *   delete:
 *     tags: [Competitions]
 *     summary: Delete a competition by ID
 *     description: Delete a competition. Only administrators can delete competitions.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the competition to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Competition deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Competition not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }

    const [result] = await db.query('DELETE FROM Competitions WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Competition not found' });
    }

    res.json({ message: 'Competition deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/competitions/register:
 *   post:
 *     tags: [Competitions]
 *     summary: Register a team for a competition
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - competition_id
 *               - team_name
 *               - leader_name
 *               - leader_email
 *               - member_names
 *             properties:
 *               competition_id:
 *                 type: integer
 *               team_name:
 *                 type: string
 *               leader_name:
 *                 type: string
 *               leader_email:
 *                 type: string
 *                 format: email
 *               member_names:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 team_code:
 *                   type: string
 */
router.post('/register', [
  auth,
  body('competition_id').isInt().withMessage('Competition ID must be an integer'),
  body('team_name').notEmpty().withMessage('Team name is required'),
  body('leader_name').notEmpty().withMessage('Leader name is required'),
  body('leader_email').isEmail().withMessage('Valid leader email is required'),
  body('member_names').isArray().withMessage('Member names must be an array'),
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      competition_id,
      team_name,
      leader_name,
      leader_email,
      member_names,
    } = req.body;

    // Check if competition exists and is open for registration
    const [competition] = await db.query(
      `SELECT c.* 
       FROM Competitions c 
       WHERE c.id = ? AND c.registration_deadline >= CURDATE()`,
      [competition_id]
    );

    if (!competition[0]) {
      return res.status(404).json({ 
        message: 'Competition not found or registration deadline has passed' 
      });
    }

    // Check if team name is already taken for this competition
    const [existingTeam] = await db.query(
      'SELECT id FROM Registrations WHERE competition_id = ? AND team_name = ?',
      [competition_id, team_name]
    );

    if (existingTeam[0]) {
      return res.status(400).json({ 
        message: 'Team name already exists for this competition' 
      });
    }

    // Generate unique team code
    const team_code = generateTeamCode(competition_id);

    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Create registration
      const [result] = await connection.query(
        `INSERT INTO Registrations (
          user_id, competition_id, team_code, team_name,
          leader_name, leader_email, member_names, status, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid')`,
        [
          req.user.id,
          competition_id,
          team_code,
          team_name,
          leader_name,
          leader_email,
          JSON.stringify(member_names),
        ]
      );

      // Generate participant IDs for team members
      const participant_ids = member_names.map((_, index) => 
        `${team_code}-P${(index + 1).toString().padStart(2, '0')}`
      );

      // Update registration with participant IDs
      await connection.query(
        'UPDATE Registrations SET participant_id = ? WHERE id = ?',
        [JSON.stringify(participant_ids), result.insertId]
      );

      await connection.commit();

      // Send confirmation email
      await sendRegistrationEmail(
        leader_email,
        team_name,
        team_code,
        competition[0].name,
        '' // Removed region name
      );

      res.status(201).json({
        message: 'Registration successful',
        team_code,
        participant_ids,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Failed to complete registration',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/competitions/send-bulk:
 *   post:
 *     tags: [Certificates]
 *     summary: Send certificates to multiple participants
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - competitionId
 *               - participants
 *             properties:
 *               competitionId:
 *                 type: integer
 *               participants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - email
 *                     - name
 *                     - position
 *                   properties:
 *                     email:
 *                       type: string
 *                       format: email
 *                     name:
 *                       type: string
 *                     position:
 *                       type: string
 */
router.post('/send-bulk', [
  auth,
  body('competitionId').isInt().withMessage('Competition ID must be an integer'),
  body('participants').isArray().withMessage('Participants must be an array'),
  body('participants.*.email').isEmail().withMessage('Valid email is required for each participant'),
  body('participants.*.name').notEmpty().withMessage('Name is required for each participant'),
  body('participants.*.position').notEmpty().withMessage('Position is required for each participant'),
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { competitionId, participants } = req.body;

    // Get competition details
    const [competition] = await db.query(
      'SELECT name FROM Competitions WHERE id = ?',
      [competitionId]
    );

    if (!competition[0]) {
      return res.status(404).json({ message: 'Competition not found' });
    }

    const results = [];
    const failed = [];

    // Process each participant
    for (const participant of participants) {
      try {
        // Generate certificate ID
        const certificateId = `CERT-${competitionId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

        // Generate certificate
        const certificatePath = await generateCertificate({
          name: participant.name,
          competitionName: competition[0].name,
          position: participant.position,
          certificateId
        });

        // Send email
        await sendCertificateEmail({
          email: participant.email,
          name: participant.name,
          competitionName: competition[0].name,
          certificatePath,
          certificateId
        });

        // Store certificate record in database
        await db.query(
          `INSERT INTO Certificates (
            competition_id, participant_name, participant_email,
            certificate_id, position, created_at
          ) VALUES (?, ?, ?, ?, ?, NOW())`,
          [
            competitionId,
            participant.name,
            participant.email,
            certificateId,
            participant.position
          ]
        );

        // Clean up certificate file
        await fs.unlink(certificatePath);

        results.push({
          email: participant.email,
          name: participant.name,
          status: 'success',
          certificateId
        });
      } catch (error) {
        console.error(`Error processing certificate for ${participant.email}:`, error);
        failed.push({
          email: participant.email,
          name: participant.name,
          error: error.message
        });
      }
    }

    res.status(200).json({
      message: 'Certificate generation and sending completed',
      successful: results,
      failed: failed
    });
  } catch (error) {
    console.error('Certificate bulk send error:', error);
    res.status(500).json({
      message: 'Failed to process certificates',
      error: error.message
    });
  }
});

module.exports = router;