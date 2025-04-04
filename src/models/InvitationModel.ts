import pool from "../config/db"


export const getAdminOrganization = async(adminId:string)=>{
    const result = await pool.query(`
      SELECT organization_id FROM user_organizations
      WHERE user_id = $1 AND role = 'admin' LIMIT 1
    ` , [adminId]);

    return result.rows[0]?.organization_id || null ;

}

export const InsertInvitation = async (organizationId:string , adminId:string , email:string , token:string)=>{
    await pool.query(
        `INSERT INTO invitations (organization_id , inviter_id , email , token) VALUES ($1 , $2 , $3 , $4)`,
        [organizationId , adminId , email , token]
    )
}

export const getInvitationByToken = async(token:string)=>{
    const result = await pool.query(
        `SELECT * FROM invitations WHERE token = $1 AND status = "pending" AND expires_at > NOW()`,
        [token]
    );

    return result.rows[0] || null ;
}


export const getUserById = async (userId: string) => {
    const result = await pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  };


  export const addUserToOrganization = async (userId: string, organizationId: string) => {
    await pool.query(
      `INSERT INTO user_organizations (user_id, organization_id, role) 
       VALUES ($1, $2, 'user')`,
      [userId, organizationId]
    );
  };

  export const updateInvitationStatus = async (invitationId: string, status: string) => {
    await pool.query(
      `UPDATE invitations SET status = $1 WHERE id = $2`,
      [status, invitationId]
    );
  };
  

  export const getPendingInvitationsForUser = async (userId: string) => {
    const result = await pool.query(
      `SELECT * FROM invitations 
       WHERE email = (SELECT email FROM users WHERE id = $1) 
       AND status = 'pending'`,
      [userId]
    );
    return result.rows;
  }