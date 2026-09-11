import { zucchettiClient } from '@archelia/zucchetti';

async function main() {
  const res: any = await zucchettiClient.query('zzna_clienti', { limit: '100000', offset: '0' }, 'A0002');
  const clients = res.data || res.dataset || res.zzna_clienti || [];
  const agents = clients.filter(c => 
    JSON.stringify(c).toLowerCase().includes('agente') || 
    JSON.stringify(c).toLowerCase().includes('rappresentante')
  );
  console.log("Found agents in clienti:", agents.length);
  if(agents.length > 0) {
     console.log("Sample:", agents[0].ancodice, agents[0].andescri, "Tipo:", agents[0].antipcon, "Cat:", agents[0].ancatcon, "Cat SCM:", agents[0].ancatscm);
  }
}
main();
