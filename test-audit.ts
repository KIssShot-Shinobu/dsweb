const prisma = require('./lib/prisma').prisma;

async function testLogging() {
    console.log("Starting Audit Log Test...");

    // 1. Trigger failed login
    console.log("Triggering failed login...");
    await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: "admin@duelstandby.com", password: "wrongpassword123" })
    });

    // 2. Trigger successful login
    console.log("Triggering successful login...");
    const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: "admin@duelstandby.com", password: "Admin123!" })
    });

    const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
    const cookieHeader = cookies ? cookies.map((c: any) => c?.split(';')[0]).filter(Boolean).join(';') : '';

    // 3. Admin fetching the audit logs
    console.log("Fetching Audit logs using Admin token...");
    const logsRes = await fetch('http://localhost:3000/api/audit-logs?limit=5', {
        headers: { 'Cookie': cookieHeader }
    });

    const logsData = await logsRes.json();
    console.log("Logs fetched count:", logsData.data?.length || 0);
    console.log("Recent logs actions:", logsData.data?.map((l: any) => l.action));

    // 4. Test missing access permission
    console.log("Testing forbidden access...");
    const forbiddenRes = await fetch('http://localhost:3000/api/audit-logs?limit=5');
    console.log("Forbidden response status:", forbiddenRes.status);

    console.log("Checking DB directly...");
    let dbCount = await prisma.auditLog.count();
    console.log("Total AuditLogs in DB before direct insert:", dbCount);

    console.log("Testing direct audit insert...");
    await require('./lib/audit-logger').logAudit({
        userId: "direct-test",
        action: "SUSPICIOUS_ACTIVITY",
        details: { test: true }
    });

    // Wait for the async insert
    await new Promise(resolve => setTimeout(resolve, 1000));

    dbCount = await prisma.auditLog.count();
    console.log("Total AuditLogs in DB after direct insert:", dbCount);

    console.log("Test execution finished.");
}

testLogging().catch(console.error);
