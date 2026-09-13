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
