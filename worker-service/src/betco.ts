import axios from "axios";
import { DateTime } from "luxon";

const Axios = axios.create({
  baseURL: "https://backofficewebadmin.betconstruct.com/api/en",
  timeout: 30000,
  headers: {
    origin: "https://backoffice.betconstruct.com",
    referer: "https://backoffice.betconstruct.com/",
  },
});

Axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      throw new Error("Yetkisiz erişim: AUTH_TOKEN geçersiz");
    }
    if (err.code === "ECONNABORTED") {
      throw new Error("Betco API bağlantı zaman aşımı");
    }
    throw err;
  }
);

const authHeader = () => ({ authentication: process.env.AUTH_TOKEN });

export const getClient = async (username: string) => {
  try {
    const { data } = await Axios.post(
      "https://backofficewebadmin.betconstruct.com/api/tr/Client/GetClients",
      { Login: username },
      { headers: authHeader() }
    );
    const list = data?.Data?.Objects;
    if (!list || list.length === 0) throw new Error(`Üye bulunamadı: ${username}`);
    return list[0];
  } catch (err: any) {
    if (err.response?.status === 404) throw new Error(`Üye bulunamadı: ${username}`);
    throw err;
  }
};

const checkBonusMoney = async (clientId: number) => {
  const { data } = await Axios.post(
    "/Client/GetClientAccounts",
    { Id: clientId },
    { headers: authHeader() }
  );
  const balances = data?.Data ?? [];
  const bonusIds = ["8124", "8125", "8154", "8155", "8123"];
  return balances.find(
    ({ BalanceTypeId, Balance }: any) =>
      bonusIds.includes(String(BalanceTypeId)) && Balance > 1
  );
};

const checkActiveBet = async (clientId: number) => {
  const now = DateTime.now().setZone("UTC+3");
  const fmt = (d: DateTime) => d.toFormat("dd-MM-yy - HH:mm:ss");

  const { data } = await Axios.post(
    "/Report/GetBetHistory",
    {
      State: 1,
      SkeepRows: 0,
      MaxRows: 10,
      IsLive: null,
      StartDateLocal: fmt(now.minus({ days: 7 })),
      EndDateLocal: fmt(now),
      ClientId: clientId,
      CurrencyId: "TRY",
      IsBonusBet: null,
      BetId: null,
      ToCurrencyId: "TRY",
    },
    { headers: authHeader() }
  );
  const bets = data?.Data?.BetData?.Objects ?? [];
  return bets.length > 0;
};

const checkIsNoBonus = async (clientId: number): Promise<boolean> => {
  const { data } = await Axios.get(
    `/Client/GetClientById?id=${clientId}`,
    { headers: authHeader() }
  );
  return data?.Data?.IsNoBonus === true;
};

const corrUp = async (clientId: number, amount: number) => {
  await Axios.post(
    "/Client/CreateClientPaymentDocument",
    {
      ClientId: clientId,
      CurrencyId: "TRY",
      DocTypeInt: 3,
      PaymentSystemId: null,
      Amount: amount,
      Info: "TEST",
    },
    { headers: authHeader() }
  );
};

export const validateAndCorrUp = async (
  username: string,
  amount: number
): Promise<void> => {
  if (!amount || amount <= 0) {
    throw new Error("Geçersiz miktar");
  }

  const client = await getClient(username);
  const clientId: number = client.Id;

  if ((client.Balance ?? 0) >= 5) {
    throw new Error(`Üyenin bakiyesi 5 TL üzerinde.`);
  }

  const [bonusMoney, hasActiveBet, isNoBonus] = await Promise.all([
    checkBonusMoney(clientId),
    checkActiveBet(clientId),
    checkIsNoBonus(clientId),
  ]);

  if (bonusMoney) {
    throw new Error(`Bonus bakiye mevcut: ${bonusMoney.Balance} TRY`);
  }

  if (hasActiveBet) {
    throw new Error("Aktif spor bahsi mevcut");
  }

  if (isNoBonus) {
    throw new Error("Üye bonuslardan dışlanmış (IsNoBonus)");
  }

  await corrUp(clientId, amount);
};
