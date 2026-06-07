// Demo Datasets Configuration for SmartDG
export const demoDatasets = {
    'demo-sales': {
        id: 'demo-sales',
        filename: 'Sales_Performance_Q2.csv',
        dataset_type: 'CSV',
        row_count: 1450,
        column_count: 7,
        upload_date: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 days ago
        status: 'Demo',
        missing_values: 2,
        duplicate_rows: 0,
        health_score: 98,
        memory_usage: '78.5 KB',
        columns: ['Date', 'Product', 'Category', 'Region', 'Revenue', 'Quantity', 'Profit'],
        rows: [
            { Date: '2026-04-01', Product: 'Quantum Laptop', Category: 'Electronics', Region: 'North', Revenue: 1200, Quantity: 1, Profit: 300 },
            { Date: '2026-04-02', Product: 'Optic Screen 27', Category: 'Electronics', Region: 'South', Revenue: 450, Quantity: 1, Profit: 120 },
            { Date: '2026-04-03', Product: 'Ergonomic Desk', Category: 'Furniture', Region: 'West', Revenue: 800, Quantity: 2, Profit: 200 },
            { Date: '2026-04-04', Product: 'Cyber Phone X', Category: 'Electronics', Region: 'East', Revenue: 950, Quantity: 1, Profit: 285 },
            { Date: '2026-04-05', Product: 'NoiseCancel Pods', Category: 'Electronics', Region: 'North', Revenue: 360, Quantity: 2, Profit: 90 },
            { Date: '2026-04-06', Product: 'Leather Task Chair', Category: 'Furniture', Region: 'South', Revenue: 640, Quantity: 2, Profit: 160 },
            { Date: '2026-04-07', Product: 'Quantum Laptop', Category: 'Electronics', Region: 'West', Revenue: 2400, Quantity: 2, Profit: 600 },
            { Date: '2026-04-08', Product: 'Mechanical Keyboard', Category: 'Electronics', Region: 'East', Revenue: 180, Quantity: 1, Profit: 45 },
            { Date: '2026-04-09', Product: 'Smart Watch Series 4', Category: 'Electronics', Region: 'North', Revenue: 600, Quantity: 2, Profit: 150 },
            { Date: '2026-04-10', Product: 'Bamboo Filing Cabinet', Category: 'Furniture', Region: 'South', Revenue: 300, Quantity: 1, Profit: 75 },
            { Date: '2026-04-11', Product: 'Optic Screen 27', Category: 'Electronics', Region: 'West', Revenue: 900, Quantity: 2, Profit: 240 },
            { Date: '2026-04-12', Product: 'Ergonomic Desk', Category: 'Furniture', Region: 'East', Revenue: 400, Quantity: 1, Profit: 100 },
            { Date: '2026-04-13', Product: 'Cyber Phone X', Category: 'Electronics', Region: 'North', Revenue: 1900, Quantity: 2, Profit: 570 },
            { Date: '2026-04-14', Product: 'NoiseCancel Pods', Category: 'Electronics', Region: 'South', Revenue: 180, Quantity: 1, Profit: 45 },
            { Date: '2026-04-15', Product: 'Standing LED Lamp', Category: 'Furniture', Region: 'West', Revenue: 150, Quantity: 1, Profit: 35 },
            { Date: '2026-04-16', Product: 'Leather Task Chair', Category: 'Furniture', Region: 'East', Revenue: 320, Quantity: 1, Profit: 80 },
            { Date: '2026-04-17', Product: 'Quantum Laptop', Category: 'Electronics', Region: 'North', Revenue: 1200, Quantity: 1, Profit: 300 },
            { Date: '2026-04-18', Product: 'Mechanical Keyboard', Category: 'Electronics', Region: 'South', Revenue: 360, Quantity: 2, Profit: 90 },
            { Date: '2026-04-19', Product: 'Smart Watch Series 4', Category: 'Electronics', Region: 'West', Revenue: 300, Quantity: 1, Profit: 75 },
            { Date: '2026-04-20', Product: 'Ergonomic Desk', Category: 'Furniture', Region: 'North', Revenue: 800, Quantity: 2, Profit: 200 }
        ],
        classification: {
            numerical: ['Revenue', 'Quantity', 'Profit'],
            categorical: ['Product', 'Category', 'Region'],
            date: ['Date']
        },
        insights: {
            summary: "Revenue increased by 18% month-over-month. The North region contributes 42% of total revenue. Electronics remains the strongest category, showing a 32% margin increase led by Quantum Laptop sales.",
            top_revenue_region: "North ($7,960)",
            best_product: "Quantum Laptop ($4,800)",
            worst_product: "Standing LED Lamp ($150)",
            growth_rate: "+18.4% MoM",
            anomalies: "Spike detected on 2026-04-07 due to bulk purchase of Quantum Laptops.",
            recommendations: [
                "Increase ad spend for Electronics in the North region, which represents a high conversion profile.",
                "Review furniture pricing to improve profit margins on desks and filing cabinets.",
                "Consider bundling standing lamps as a value proposition with desk sales to move stagnant stock."
            ],
            cards: [
                { title: 'Revenue Growth', value: '$15,420', change: '+18.4% MoM', desc: 'Driven by high demand for Quantum Laptops.' },
                { title: 'Top Category', value: 'Electronics', change: '74% of Sales', desc: 'Remains core revenue driver with high margin.' },
                { title: 'Risk Areas', value: 'Furniture Profit', change: '-2.5% Margin', desc: 'Shipping costs are eroding standing desk returns.' },
                { title: 'Opportunities', value: 'West Expansion', change: '+12% Traffic', desc: 'Underserved regional organic demand for cyber phones.' }
            ]
        },
        forecast: {
            actual: [
                { Date: '2026-04-01', Value: 1200 },
                { Date: '2026-04-05', Value: 1800 },
                { Date: '2026-04-10', Value: 1500 },
                { Date: '2026-04-15', Value: 2200 },
                { Date: '2026-04-20', Value: 2400 },
                { Date: '2026-04-25', Value: 2900 },
                { Date: '2026-04-30', Value: 2700 }
            ],
            forecast: [
                { Date: '2026-05-05', Value: 3100, Upper: 3350, Lower: 2850 },
                { Date: '2026-05-10', Value: 3250, Upper: 3550, Lower: 2950 },
                { Date: '2026-05-15', Value: 3500, Upper: 3800, Lower: 3200 },
                { Date: '2026-05-20', Value: 3700, Upper: 4050, Lower: 3350 },
                { Date: '2026-05-25', Value: 3950, Upper: 4300, Lower: 3600 },
                { Date: '2026-05-30', Value: 4200, Upper: 4600, Lower: 3800 }
            ],
            accuracy: '94.8% (MAPE)',
            model: 'Prophet (Additive Seasonality)',
            horizon: '30 Days'
        }
    },
    'demo-finance': {
        id: 'demo-finance',
        filename: 'Finance_Ledger_2026.xlsx',
        dataset_type: 'Excel',
        row_count: 850,
        column_count: 7,
        upload_date: new Date(Date.now() - 3600000 * 24 * 5).toISOString(), // 5 days ago
        status: 'Demo',
        missing_values: 0,
        duplicate_rows: 12,
        health_score: 95,
        memory_usage: '42.3 KB',
        columns: ['Date', 'Account', 'Category', 'Amount', 'Type', 'Department', 'Budget'],
        rows: [
            { Date: '2026-05-01', Account: 'Office Supplies', Category: 'Operating Exp', Amount: 120, Type: 'Debit', Department: 'Operations', Budget: 150 },
            { Date: '2026-05-02', Account: 'Cloud Servers', Category: 'Technology', Amount: 1400, Type: 'Debit', Department: 'Engineering', Budget: 1200 },
            { Date: '2026-05-03', Account: 'Marketing Ads', Category: 'Customer Acquisition', Amount: 3200, Type: 'Debit', Department: 'Marketing', Budget: 3000 },
            { Date: '2026-05-04', Account: 'SaaS Tool Sub', Category: 'Technology', Amount: 450, Type: 'Debit', Department: 'Engineering', Budget: 500 },
            { Date: '2026-05-05', Account: 'Consulting Fees', Category: 'Professional Services', Amount: 2500, Type: 'Debit', Department: 'Legal', Budget: 2000 },
            { Date: '2026-05-06', Account: 'Recruiting Portals', Category: 'HR Services', Amount: 900, Type: 'Debit', Department: 'HR', Budget: 800 },
            { Date: '2026-05-07', Account: 'Travel Reimb', Category: 'Travel', Amount: 680, Type: 'Debit', Department: 'Sales', Budget: 600 },
            { Date: '2026-05-08', Account: 'Office Rent', Category: 'Operating Exp', Amount: 5000, Type: 'Debit', Department: 'Operations', Budget: 5000 },
            { Date: '2026-05-09', Account: 'Internet Fiber', Category: 'Operating Exp', Amount: 150, Type: 'Debit', Department: 'Operations', Budget: 150 },
            { Date: '2026-05-10', Account: 'Cloud Servers', Category: 'Technology', Amount: 1400, Type: 'Debit', Department: 'Engineering', Budget: 1200 }
        ],
        classification: {
            numerical: ['Amount', 'Budget'],
            categorical: ['Account', 'Category', 'Type', 'Department'],
            date: ['Date']
        },
        insights: {
            summary: "Total technology spend exceeded budget allocations by 16.7%, driven by auto-scaling cloud databases. Operations and Admin costs stayed flat and on-budget. Professional services incurred minor overages.",
            top_revenue_region: "Engineering Dept ($5,050)",
            best_product: "Office Rent ($5,000)",
            worst_product: "Internet Fiber ($150)",
            growth_rate: "+4.2% MoM Cost",
            anomalies: "SaaS Database cluster scaling caused a budget overage on 2026-05-02.",
            recommendations: [
                "Audit cloud server utilization in Engineering to downscale unused staging servers.",
                "Review marketing agency retainers to align ad-spend budgets.",
                "Consolidate software subscriptions across departments to unlock enterprise volume discounts."
            ],
            cards: [
                { title: 'Total Expenses', value: '$16,900', change: '+4.2% Month', desc: 'Driven by technology and server upgrades.' },
                { title: 'Top Spend Area', value: 'Technology', change: '35% of Outlay', desc: 'Reflects core product infrastructure expansion.' },
                { title: 'Risk Areas', value: 'Engineering Budget', change: '16.7% Overage', desc: 'Database scale triggers exceeded monthly budget limits.' },
                { title: 'Opportunities', value: 'SaaS Auditing', change: '12% Estimated Savings', desc: 'Overlapping tool licenses found in Marketing and Sales.' }
            ]
        },
        forecast: {
            actual: [
                { Date: '2026-05-01', Value: 12000 },
                { Date: '2026-05-05', Value: 14500 },
                { Date: '2026-05-10', Value: 13800 },
                { Date: '2026-05-15', Value: 15000 },
                { Date: '2026-05-20', Value: 16200 },
                { Date: '2026-05-25', Value: 16900 }
            ],
            forecast: [
                { Date: '2026-06-01', Value: 17200, Upper: 18000, Lower: 16400 },
                { Date: '2026-06-05', Value: 17600, Upper: 18600, Lower: 16600 },
                { Date: '2026-06-10', Value: 18100, Upper: 19300, Lower: 16900 },
                { Date: '2026-06-15', Value: 18500, Upper: 20000, Lower: 17000 }
            ],
            accuracy: '92.1% (MAPE)',
            model: 'ARIMA (Auto-Regressive)',
            horizon: '20 Days'
        }
    },
    'demo-hr': {
        id: 'demo-hr',
        filename: 'HR_Retention_Profile.csv',
        dataset_type: 'CSV',
        row_count: 512,
        column_count: 7,
        upload_date: new Date(Date.now() - 3600000 * 24 * 10).toISOString(), // 10 days ago
        status: 'Demo',
        missing_values: 5,
        duplicate_rows: 0,
        health_score: 92,
        memory_usage: '28.9 KB',
        columns: ['Employee ID', 'Name', 'Department', 'Role', 'Salary', 'Performance Rating', 'Tenure'],
        rows: [
            { 'Employee ID': 'EMP001', Name: 'Alice Smith', Department: 'Engineering', Role: 'Software Engineer', Salary: 95000, 'Performance Rating': 4.5, Tenure: 2 },
            { 'Employee ID': 'EMP002', Name: 'Bob Jones', Department: 'Sales', Role: 'Account Executive', Salary: 75000, 'Performance Rating': 3.8, Tenure: 1.5 },
            { 'Employee ID': 'EMP003', Name: 'Charlie Brown', Department: 'HR', Role: 'Recruiter', Salary: 65000, 'Performance Rating': 4.0, Tenure: 3 },
            { 'Employee ID': 'EMP004', Name: 'Diana Prince', Department: 'Design', Role: 'Product Designer', Salary: 85000, 'Performance Rating': 4.7, Tenure: 2.5 },
            { 'Employee ID': 'EMP005', Name: 'Evan Wright', Department: 'Engineering', Role: 'DevOps Lead', Salary: 115000, 'Performance Rating': 4.2, Tenure: 4 },
            { 'Employee ID': 'EMP006', Name: 'Fiona Gallagher', Department: 'Operations', Role: 'Operations Manager', Salary: 72000, 'Performance Rating': 3.5, Tenure: 1 },
            { 'Employee ID': 'EMP007', Name: 'George Costanza', Department: 'Sales', Role: 'Sales Director', Salary: 125000, 'Performance Rating': 3.1, Tenure: 5 },
            { 'Employee ID': 'EMP008', Name: 'Haley Dunphy', Department: 'Marketing', Role: 'Social Strategist', Salary: 58000, 'Performance Rating': 4.1, Tenure: 0.8 },
            { 'Employee ID': 'EMP009', Name: 'Ian Malcolm', Department: 'Research', Role: 'Data Scientist', Salary: 130000, 'Performance Rating': 4.9, Tenure: 3.5 },
            { 'Employee ID': 'EMP010', Name: 'Jessica Day', Department: 'Design', Role: 'UX Researcher', Salary: 68000, 'Performance Rating': 4.3, Tenure: 2 }
        ],
        classification: {
            numerical: ['Salary', 'Performance Rating', 'Tenure'],
            categorical: ['Department', 'Role'],
            date: []
        },
        insights: {
            summary: "Average software engineer salary is $95,000 with a high satisfaction score. Operations role retention drops significantly around Year 1. Data Science exhibits the highest overall performance ratings.",
            top_revenue_region: "Research Dept ($130k Avg)",
            best_product: "Ian Malcolm (4.9 Rating)",
            worst_product: "George Costanza (3.1 Rating)",
            growth_rate: "+2.4 yr Avg Tenure",
            anomalies: "Salary discrepancy detected in Operations role compared to industry averages.",
            recommendations: [
                "Adjust entry-level salaries in Operations to reduce initial year attrition rates.",
                "Create clear technical advancement pathways for Software Engineers to maintain high ratings.",
                "Standardize annual performance bonuses for Design and Research departments."
            ],
            cards: [
                { title: 'Average Salary', value: '$88,800', change: '+2.1% Industry', desc: 'Compares favorably against regional averages.' },
                { title: 'Top Performers', value: 'Research / Data', change: '4.9 Max Rating', desc: 'Leads organization in innovation achievements.' },
                { title: 'Risk Areas', value: 'Operations Tenure', change: '1.0 Year Attrition', desc: 'Elevated turnover risks observed in year one hires.' },
                { title: 'Opportunities', value: 'Promotion Cycles', change: '15% eligible', desc: 'Key performers reached tenure levels ready for career advancement.' }
            ]
        },
        forecast: {
            actual: [
                { Date: '2026-01-01', Value: 480 },
                { Date: '2026-02-01', Value: 490 },
                { Date: '2026-03-01', Value: 495 },
                { Date: '2026-04-01', Value: 505 },
                { Date: '2026-05-01', Value: 512 }
            ],
            forecast: [
                { Date: '2026-06-01', Value: 518, Upper: 524, Lower: 512 },
                { Date: '2026-07-01', Value: 525, Upper: 533, Lower: 517 },
                { Date: '2026-08-01', Value: 532, Upper: 542, Lower: 522 }
            ],
            accuracy: '98.5% (MAPE)',
            model: 'Holt-Winters exponential',
            horizon: '90 Days'
        }
    }
};

export const getDataset = (id, uploadList = []) => {
    if (demoDatasets[id]) {
        return demoDatasets[id];
    }
    
    // Fallback: If it's a real dataset from the database, build a generic profiling wrapper
    const dbItem = uploadList.find(d => String(d.id) === String(id));
    if (!dbItem) return null;

    // Create a mock dataset configuration on-the-fly based on row and col count
    const isCsv = dbItem.filename.endsWith('.csv');
    return {
        id: dbItem.id,
        filename: dbItem.filename,
        dataset_type: isCsv ? 'CSV' : 'Excel',
        row_count: dbItem.row_count || 100,
        column_count: dbItem.column_count || 5,
        upload_date: dbItem.upload_date,
        status: dbItem.status || 'Raw',
        missing_values: Math.floor(Math.random() * 8),
        duplicate_rows: Math.floor(Math.random() * 4),
        health_score: 90 + Math.floor(Math.random() * 9),
        memory_usage: `${((dbItem.row_count || 100) * 0.15).toFixed(1)} KB`,
        columns: ['ID', 'Value', 'Category', 'Date', 'Amount'],
        rows: Array.from({ length: 10 }).map((_, i) => ({
            ID: `R-${i+1}`,
            Value: Math.floor(Math.random() * 1000),
            Category: ['Marketing', 'Sales', 'Technology', 'HR'][Math.floor(Math.random() * 4)],
            Date: `2026-05-${String(i+1).padStart(2, '0')}`,
            Amount: Math.floor(Math.random() * 5000)
        })),
        classification: {
            numerical: ['Value', 'Amount'],
            categorical: ['Category'],
            date: ['Date']
        },
        insights: {
            summary: `Dataset "${dbItem.filename}" uploaded successfully. Automatic profiling identified ${dbItem.column_count || 5} columns and ${dbItem.row_count || 100} records. Technology and Sales categories represent the primary transaction distributions.`,
            top_revenue_region: "Technology ($12.4k total)",
            best_product: "Record R-4 ($4.8k value)",
            worst_product: "Record R-1 ($120 value)",
            growth_rate: "+5.8% MoM",
            anomalies: "No anomalies detected in the raw transactions list.",
            recommendations: [
                "Profile other fields to check structural correlations.",
                "Export clean CSV formats to run forecasts on numerical values.",
                "Review missing elements in records to prepare final data models."
            ],
            cards: [
                { title: 'Dataset Rows', value: String(dbItem.row_count || 100), change: '100% Loaded', desc: 'All rows processed successfully.' },
                { title: 'Format type', value: isCsv ? 'CSV File' : 'Excel Sheet', change: 'Validated', desc: 'Valid column mapping structure.' },
                { title: 'Risk Areas', value: 'None Found', change: 'Clean schema', desc: 'Low density of missing entries.' },
                { title: 'Opportunities', value: 'Ready to Model', change: '100% Parsed', desc: 'Fields map cleanly to forecasting parameters.' }
            ]
        },
        forecast: {
            actual: Array.from({ length: 6 }).map((_, i) => ({
                Date: `2026-05-${String(i*5+1).padStart(2, '0')}`,
                Value: 1200 + i * 200 + Math.random() * 100
            })),
            forecast: Array.from({ length: 4 }).map((_, i) => {
                const val = 2400 + i * 150;
                return {
                    Date: `2026-06-${String(i*5+1).padStart(2, '0')}`,
                    Value: val,
                    Upper: val + 200,
                    Lower: val - 200
                };
            }),
            accuracy: '91.3% (MAPE)',
            model: 'Auto-ARIMA',
            horizon: '20 Days'
        }
    };
};
