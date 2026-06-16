const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');
const { formatDate } = require('../utils/formatters');

router.get('/:query', async (req, res) => {
  const { query } = req.params;
  try {
    const pool = await getPool();
    const isCnic = /^\d{13}$/.test(query);

    const result = await pool.request()
      .input('param', sql.BigInt, query)
      .query(isCnic
        ? `SELECT f.[FormID] AS [applicationId], f.[FullName] AS [fullName],
            p.[ProjectName] AS [projectName], v.[Vacancy_Name] AS [appliedFor],
            f.[AppliedOn] AS [appliedOn], f.[IsReviewed] AS [reviewStatus],
            c.[IsPaid] AS [paymentStatus]
          FROM [STSDB].[dbo].[Forms] f
          INNER JOIN [STSDB].[dbo].[Challans] c ON f.[FormID] = c.[FormID]
          INNER JOIN [STSDB].[dbo].[Projects] p ON f.[ProjectID] = p.[ID]
          INNER JOIN [STSDB].[dbo].[Vacancies] v ON f.[VacancyID] = v.[VID]
          WHERE f.[CNIC] = @param ORDER BY f.[AppliedOn] DESC`
        : `SELECT f.[FormID] AS [applicationId], f.[FullName] AS [fullName],
            p.[ProjectName] AS [projectName], v.[Vacancy_Name] AS [appliedFor],
            f.[AppliedOn] AS [appliedOn], f.[IsReviewed] AS [reviewStatus],
            c.[IsPaid] AS [paymentStatus]
          FROM [STSDB].[dbo].[Forms] f
          INNER JOIN [STSDB].[dbo].[Challans] c ON f.[FormID] = c.[FormID]
          INNER JOIN [STSDB].[dbo].[Projects] p ON f.[ProjectID] = p.[ID]
          INNER JOIN [STSDB].[dbo].[Vacancies] v ON f.[VacancyID] = v.[VID]
          WHERE f.[FormID] = @param`
      );

    res.json(result.recordset.map(r => ({
      applicationId: String(r.applicationId),
      fullName: (r.fullName || '').trim(),
      projectName: (r.projectName || '').trim(),
      appliedFor: r.appliedFor || '',
      appliedOn: formatDate(r.appliedOn),
      reviewStatus: r.reviewStatus ? 'Reviewed' : 'Not Reviewed',
      paymentStatus: r.paymentStatus ? 'Challan Paid' : 'Unpaid'
    })));
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
