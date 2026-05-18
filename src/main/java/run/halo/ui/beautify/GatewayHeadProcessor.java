package run.halo.ui.beautify;

import java.util.Set;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.ITemplateContext;
import org.thymeleaf.model.IModel;
import org.thymeleaf.processor.element.IElementModelStructureHandler;
import reactor.core.publisher.Mono;
import run.halo.app.plugin.ReactiveSettingFetcher;
import run.halo.app.theme.dialect.TemplateHeadProcessor;

@Component
public class GatewayHeadProcessor implements TemplateHeadProcessor {

    private static final String PLUGIN_NAME = "plugin-ui-beautify";

    private static final String STATIC_BASE =
        "/plugins/" + PLUGIN_NAME + "/assets/static/";

    private static final Set<String> VALID_THEMES = Set.of(
        "default", "ocean", "deepblue", "dark", "sakura", "minimal", "aurora", "neon"
    );

    private static final String DEFAULT_THEME = "minimal";

    private final ReactiveSettingFetcher settingFetcher;

    public GatewayHeadProcessor(ReactiveSettingFetcher settingFetcher) {
        this.settingFetcher = settingFetcher;
    }

    private Mono<Boolean> isGatewayEnabled() {
        return settingFetcher.getSettingValue("basic")
            .map(setting -> setting.path("enableGateway").asBoolean(true))
            .defaultIfEmpty(true);
    }

    private Mono<String> getGatewayTheme() {
        return settingFetcher.getSettingValue("basic")
            .map(setting -> {
                String theme = setting.path("gatewayTheme").asText(DEFAULT_THEME);
                return VALID_THEMES.contains(theme) ? theme : DEFAULT_THEME;
            })
            .defaultIfEmpty(DEFAULT_THEME);
    }

    @Override
    public Mono<Void> process(ITemplateContext context, IModel model,
        IElementModelStructureHandler structureHandler) {
        return isGatewayEnabled()
            .flatMap(enabled -> enabled ? getGatewayTheme() : Mono.empty())
            .doOnNext(theme -> {
                String injection = "\n<script>window.__UI_BEAUTIFY_GATEWAY__={theme:\""
                    + theme + "\"};window.__UI_BEAUTIFY_THEME__=\""
                    + theme + "\";</script>\n"
                    + "<script id=\"ui-beautify-gateway-loader-js\" src=\""
                    + STATIC_BASE + "gateway-loader.js\" defer></script>\n";
                model.addModel(context.getModelFactory()
                    .parse(context.getTemplateData(), injection));
            })
            .then();
    }
}
