import { getDataset } from "../_lib/dataset";
import {
  domainValues,
  kindTree,
  licenseValues,
  platformTargetValues,
  primaryLanguageValues,
  primaryUseValues,
  runtimeValues,
  stewardTypeValues,
  stewardValues
} from "../_lib/dataset.schema";
import { jsonCacheForDay, serverError } from "../_lib/http";

export const onRequestGet = async () => {
  try {
    const items = getDataset().map((item) => ({
      id: item.id,
      name: item.name,
      kindPath: item.kindPath,
      domains: item.domains,
      primaryUse: item.primaryUse,
      platformTargets: item.platformTargets,
      runtimes: item.runtimes,
      ecosystemPath: item.ecosystemPath,
      primaryLanguage: item.primaryLanguage,
      license: item.license,
      stewardType: item.stewardType,
      steward: item.steward,
      initialReleaseYear: item.initialReleaseYear,
      openSource: item.openSource
    }));

    return jsonCacheForDay({
      taxonomy: {
        kindTree,
        domains: [...domainValues],
        primaryUse: [...primaryUseValues],
        platformTargets: [...platformTargetValues],
        runtimes: [...runtimeValues],
        primaryLanguage: [...primaryLanguageValues],
        licenses: [...licenseValues],
        stewardType: [...stewardTypeValues],
        stewards: [...stewardValues]
      },
      items
    });
  } catch {
    return serverError();
  }
};

