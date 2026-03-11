package run.halo.ui.beautify;

import java.nio.charset.StandardCharsets;
import java.util.Set;
import org.reactivestreams.Publisher;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferFactory;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.http.server.reactive.ServerHttpResponseDecorator;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import run.halo.app.plugin.ReactiveSettingFetcher;
import run.halo.app.security.AdditionalWebFilter;

@Component
public class GatewayStyleInjector implements AdditionalWebFilter {

    private static final String PLUGIN_NAME = "plugin-ui-beautify";

    private static final String CSS_BASE =
        "/plugins/" + PLUGIN_NAME + "/assets/static/";

    private static final String JS_BASE =
        "/plugins/" + PLUGIN_NAME + "/assets/static/";

    /** Exact-match paths. */
    private static final Set<String> GATEWAY_EXACT = Set.of(
        "/login", "/signup", "/logout", "/setup"
    );

    /** Prefix-match paths (always end with /). */
    private static final Set<String> GATEWAY_PREFIX = Set.of(
        "/challenges/", "/password-reset/"
    );

    private static final Set<String> VALID_THEMES = Set.of(
        "default", "ocean", "dark", "sakura", "minimal", "aurora"
    );

    private final ReactiveSettingFetcher settingFetcher;

    public GatewayStyleInjector(ReactiveSettingFetcher settingFetcher) {
        this.settingFetcher = settingFetcher;
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE - 10;
    }

    private boolean isGatewayPage(String path) {
        if (GATEWAY_EXACT.contains(path)) {
            return true;
        }
        return GATEWAY_PREFIX.stream().anyMatch(path::startsWith);
    }

    private Mono<Boolean> isGatewayEnabled() {
        return settingFetcher.get("basic")
            .map(setting ->
                setting.path("enableGateway").asBoolean(true))
            .defaultIfEmpty(true);
    }

    private Mono<String> getGatewayTheme() {
        return settingFetcher.get("basic")
            .map(setting -> {
                String theme =
                    setting.path("gatewayTheme").asText("default");
                return VALID_THEMES.contains(theme)
                    ? theme : "default";
            })
            .defaultIfEmpty("default");
    }

    @Override
    @NonNull
    public Mono<Void> filter(@NonNull ServerWebExchange exchange,
        @NonNull WebFilterChain chain) {
        String path = exchange.getRequest().getPath().value();

        if (!isGatewayPage(path)) {
            return chain.filter(exchange);
        }

        return isGatewayEnabled().flatMap(enabled -> {
            if (!enabled) {
                return chain.filter(exchange);
            }
            return getGatewayTheme().flatMap(theme -> {
                String injection =
                    "<link rel=\"stylesheet\" href=\""
                        + CSS_BASE + "gateway-beautify.css\" />\n"
                        + "<link rel=\"stylesheet\" href=\""
                        + CSS_BASE + "gateway-" + theme
                        + ".css\" />\n"
                        + "<script src=\"" + JS_BASE
                        + "gateway-effects.js\" defer></script>\n"
                        + "<script>window.__UI_BEAUTIFY_THEME__=\""
                        + theme + "\";</script>\n";

                ServerHttpResponse originalResponse =
                    exchange.getResponse();
                DataBufferFactory bufferFactory =
                    originalResponse.bufferFactory();

                ServerHttpResponseDecorator decoratedResponse =
                    new ServerHttpResponseDecorator(originalResponse) {
                        @Override
                        @NonNull
                        public Mono<Void> writeWith(
                            @NonNull Publisher<? extends DataBuffer>
                                body) {
                            MediaType contentType =
                                getHeaders().getContentType();
                            if (contentType != null
                                && contentType.isCompatibleWith(
                                    MediaType.TEXT_HTML)) {
                                Flux<? extends DataBuffer> fluxBody =
                                    Flux.from(body);
                                return super.writeWith(
                                    DataBufferUtils.join(fluxBody)
                                        .map(dataBuffer -> {
                                            byte[] content;
                                            try {
                                                content = new byte[
                                                    dataBuffer
                                                        .readableByteCount()
                                                ];
                                                dataBuffer
                                                    .read(content);
                                            } finally {
                                                DataBufferUtils
                                                    .release(
                                                        dataBuffer);
                                            }
                                            String html = new String(
                                                content,
                                                StandardCharsets.UTF_8
                                            );
                                            String modified =
                                                html.replace(
                                                    "</head>",
                                                    injection
                                                        + "</head>"
                                                );
                                            byte[] newContent =
                                                modified.getBytes(
                                                    StandardCharsets
                                                        .UTF_8);
                                            getHeaders()
                                                .setContentLength(
                                                    newContent.length
                                                );
                                            return bufferFactory
                                                .wrap(newContent);
                                        }).flux()
                                );
                            }
                            return super.writeWith(body);
                        }
                    };

                exchange.getResponse().getHeaders()
                    .remove(HttpHeaders.CONTENT_LENGTH);

                return chain.filter(
                    exchange.mutate()
                        .response(decoratedResponse).build());
            });
        });
    }
}
