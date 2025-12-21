import { prisma } from "@/lib/db";

export default async function Home() {
  // 1. Try to connect and fetch data
  let status = "Checking connection...";
  let userCount = 0;
  let error = null;

  try {
    // Attempt to fetch users (will be empty array [] if no users exist)
    // REPLACE 'user' below with your actual model name if it's different (e.g. 'users', 'account')
    const users = await prisma.user.findMany(); 
    userCount = users.length;
    status = "✅ Connected successfully!";
  } catch (e: any) {
    status = "❌ Connection failed";
    error = e.message;
    console.error(e);
  }

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>Database Status</h1>
      
      <div style={{ 
        padding: "20px", 
        border: "1px solid #ccc", 
        borderRadius: "8px",
        backgroundColor: error ? "#fee2e2" : "#dcfce7", 
        color: error ? "#991b1b" : "#166534"
      }}>
        <h2>{status}</h2>
        
        {error ? (
          <p><strong>Error details:</strong> {error}</p>
        ) : (
          <p>We found <strong>{userCount}</strong> users in the database.</p>
        )}
      </div>

      <p style={{ marginTop: "20px", color: "#666" }}>
        *Note: If it says "Connected" but "0 users", your database works perfectly! It's just empty.
      </p>
    </div>
  );
}