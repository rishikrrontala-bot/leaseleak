// A realistic 16-unit rent roll across three small buildings. Names are fictional;
// ZIPs are real and exist in both the HUD SAFMR and Zillow ZORI datasets.
export const SAMPLE_CSV = `Property,Unit,Tenant,Beds,Rent,Lease Start,Lease End,ZIP
1704 S 5th St (Austin TX),A1,M. Okafor,2,"$1,750",11/01/2025,10/31/2026,78704
1704 S 5th St (Austin TX),A2,J. Delgado,2,"$1,750",02/01/2026,01/31/2027,78704
1704 S 5th St (Austin TX),A3,R. Chen,1,"$1,700",12/01/2025,11/30/2026,78704
1704 S 5th St (Austin TX),A4,S. Patel,1,"$1,850",07/01/2026,06/30/2027,78704
221 E 11th Ave (Columbus OH),1,T. Nguyen,1,"$1,200",01/01/2026,12/31/2026,43201
221 E 11th Ave (Columbus OH),2,A. Brooks,1,"$1,250",03/01/2026,02/28/2027,43201
221 E 11th Ave (Columbus OH),3,K. Adebayo,2,"$1,450",10/16/2025,10/15/2026,43201
221 E 11th Ave (Columbus OH),4,L. Romero,2,"$1,725",08/01/2026,07/31/2027,43201
221 E 11th Ave (Columbus OH),5,D. Fischer,Studio,"$1,100",04/01/2026,03/31/2027,43201
221 E 11th Ave (Columbus OH),6,P. Haddad,3,"$1,850",11/16/2025,11/15/2026,43201
5400 Penn Ave (Pittsburgh PA),101,E. Kowalski,1,"$1,300",11/02/2025,11/01/2026,15206
5400 Penn Ave (Pittsburgh PA),102,N. Sato,1,"$1,495",06/01/2026,05/31/2027,15206
5400 Penn Ave (Pittsburgh PA),201,G. Mensah,2,"$1,550",01/16/2026,01/15/2027,15206
5400 Penn Ave (Pittsburgh PA),202,V. Ivanova,2,"$1,650",12/16/2025,12/15/2026,15206
5400 Penn Ave (Pittsburgh PA),301,H. Lindqvist,3,"$2,050",09/01/2026,08/31/2027,15206
5400 Penn Ave (Pittsburgh PA),302,B. Marchetti,2,"$1,825",05/01/2026,04/30/2027,15206
`;

export const TEMPLATE_CSV = `Property,Unit,Tenant,Beds,Rent,Lease Start,Lease End,ZIP
123 Main St,1A,,2,1500,01/01/2026,12/31/2026,00000
`;

// The same three buildings exported the way property-management software actually
// exports them: no ZIP column, addresses with city and state, unit types as "2x1",
// rents with cents, two-digit years, and headers the heuristics don't know.
// The AI fallback has to map the columns and infer the ZIPs.
export const SAMPLE_MESSY_CSV = `Bldg / Street,Apt #,Resident,Sq Ft,Type,Mo. Rate,Move-in,Exp.
"1704 S 5th St, Austin, TX",A1,M. Okafor,910,2x1,"$1,750.00",11/1/25,10/31/26
"1704 S 5th St, Austin, TX",A2,J. Delgado,910,2x1,"$1,750.00",2/1/26,1/31/27
"1704 S 5th St, Austin, TX",A3,R. Chen,640,1x1,"$1,700.00",12/1/25,11/30/26
"1704 S 5th St, Austin, TX",A4,S. Patel,655,1x1,"$1,850.00",7/1/26,6/30/27
"221 E 11th Ave, Columbus, OH",1,T. Nguyen,600,1x1,"$1,200.00",1/1/26,12/31/26
"221 E 11th Ave, Columbus, OH",2,A. Brooks,610,1x1,"$1,250.00",3/1/26,2/28/27
"221 E 11th Ave, Columbus, OH",3,K. Adebayo,880,2x1,"$1,450.00",10/16/25,10/15/26
"221 E 11th Ave, Columbus, OH",4,L. Romero,900,2x1,"$1,725.00",8/1/26,7/31/27
"221 E 11th Ave, Columbus, OH",5,D. Fischer,420,Studio,"$1,100.00",4/1/26,3/31/27
"221 E 11th Ave, Columbus, OH",6,P. Haddad,1150,3x2,"$1,850.00",11/16/25,11/15/26
"5400 Penn Ave, Pittsburgh, PA",101,E. Kowalski,620,1x1,"$1,300.00",11/2/25,11/1/26
"5400 Penn Ave, Pittsburgh, PA",102,N. Sato,630,1x1,"$1,495.00",5/1/26,4/30/27
"5400 Penn Ave, Pittsburgh, PA",201,G. Mensah,890,2x1,"$1,550.00",1/16/26,1/15/27
"5400 Penn Ave, Pittsburgh, PA",202,V. Ivanova,900,2x1,"$1,650.00",9/1/26,8/31/27
"5400 Penn Ave, Pittsburgh, PA",301,H. Lindqvist,1200,3x2,"$2,050.00",9/1/26,8/31/27
"5400 Penn Ave, Pittsburgh, PA",302,B. Marchetti,905,2x1,"$1,825.00",6/1/26,5/31/27
`;
