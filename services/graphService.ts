import { msalInstance, loginRequest } from "../authConfig";

export const sendLeaveEmailViaGraph = async (
    managerEmail: string, 
    employeeName: string, 
    leaveReq: any
) => {
    try {
        const account = msalInstance.getAllAccounts()[0];
        if (!account) throw new Error("No Microsoft account found for email sending.");

        const response = await msalInstance.acquireTokenSilent({
            ...loginRequest,
            account: account
        });

        const approveUrl = `${window.location.origin}${window.location.pathname}?action=approveLeave&id=${leaveReq.id}`;
        const rejectUrl = `${window.location.origin}${window.location.pathname}?action=rejectLeave&id=${leaveReq.id}`;

        const mail = {
            message: {
                subject: `Cerere concediu: ${employeeName} - ${leaveReq.typeName}`,
                body: {
                    contentType: "HTML",
                    content: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                            <h2 style="color: #059669;">Cerere Nouă de Concediu</h2>
                            <p><strong>${employeeName}</strong> a solicitat un concediu.</p>
                            <ul>
                                <li><strong>Tip:</strong> ${leaveReq.typeName}</li>
                                <li><strong>Perioadă:</strong> ${leaveReq.startDate} - ${leaveReq.endDate}</li>
                                <li><strong>Observații:</strong> ${leaveReq.reason || 'Niciun motiv specificat'}</li>
                            </ul>
                            <br/>
                            <div style="display: flex; gap: 10px;">
                                <a href="${approveUrl}" style="background-color: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">Aprobă Cererea</a>
                                <a href="${rejectUrl}" style="background-color: #EF4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Respinge Cererea</a>
                            </div>
                            <br/>
                            <p style="font-size: 12px; color: #888;">Notificare generată automat de aplicația de pontaj Bioeel.</p>
                        </div>
                    `
                },
                toRecipients: [
                    {
                        emailAddress: {
                            address: managerEmail
                        }
                    }
                ]
            }
        };

        const fetchResponse = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${response.accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(mail)
        });

        if (!fetchResponse.ok) {
            throw new Error(`Graph API error: ${fetchResponse.statusText}`);
        }
        
        console.log("Email sent successfully via MSAL Graph API!");
        return true;
    } catch (e) {
        console.error("Error sending email via MSAL:", e);
        return false;
    }
};
