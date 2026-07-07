<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';

	// Fleet Care est désormais intégré dans la page Accueil via le segment switcher.
	goto(resolve(localizedHref('/app')), { replaceState: true });
</script>
